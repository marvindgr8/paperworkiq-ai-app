import OpenAI from "openai";
import { z } from "zod";
import { env } from "../lib/env.js";

export interface OpenAICategorizationInput {
  documentId: string;
  workspaceId: string;
  filename?: string | null;
  uploadedNote?: string | null;
  issuer?: string | null;
  extractedTextSnippet?: string | null;
  existingCategories: string[];
}

export interface OpenAICategorizationResult {
  categoryName: string;
  confidence: number;
  rationale?: string;
  reuseExisting?: boolean;
  rawResponse: string;
  model: string;
}

const responseSchema = z.object({
  categoryName: z.string().min(1),
  confidence: z.number().optional(),
  rationale: z.string().optional(),
  reuseExisting: z.boolean().optional(),
});

const clampConfidence = (value: number) => Math.max(0, Math.min(1, value));

const extractJson = (content: string) => {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in response");
  }
  return content.slice(start, end + 1);
};

const buildUserPrompt = (input: OpenAICategorizationInput) => {
  const lines = [
    "Document metadata:",
    `- Filename: ${input.filename ?? "(none)"}`,
    `- Uploaded note: ${input.uploadedNote ?? "(none)"}`,
    `- Issuer: ${input.issuer ?? "(none)"}`,
    `- Extracted text snippet: ${input.extractedTextSnippet ?? "(none)"}`,
    "",
    "Existing categories in this workspace (reuse if possible):",
    input.existingCategories.length > 0 ? input.existingCategories.join(", ") : "(none)",
  ];

  return lines.join("\n");
};

const createClient = () => {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
};

const parseResponse = (content: string) => {
  const json = JSON.parse(extractJson(content));
  const parsed = responseSchema.parse(json);
  const confidence = clampConfidence(parsed.confidence ?? 0.5);
  return {
    categoryName: parsed.categoryName,
    confidence,
    rationale: parsed.rationale,
    reuseExisting: parsed.reuseExisting,
  };
};

export const categorizeDocumentWithOpenAI = async (
  input: OpenAICategorizationInput
): Promise<OpenAICategorizationResult> => {
  const client = createClient();
  const systemPrompt =
    "You are categorizing personal paperwork documents into short, human-friendly categories. " +
    "Prefer 1–2 words such as Council Tax, Energy, Banking, Healthcare, Housing, Insurance, " +
    "School, Employment, Subscriptions, Legal, Other. If unsure, pick Other. " +
    "Avoid creating overly-specific categories.";

  const baseMessages = [
    { role: "system" as const, content: systemPrompt },
    {
      role: "user" as const,
      content:
        buildUserPrompt(input) +
        "\n\nReturn STRICT JSON with fields: categoryName, confidence (0-1), rationale, reuseExisting.",
    },
  ];

  const attemptRequest = async (messages: typeof baseMessages, retry = false) => {
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
      temperature: 0.1,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content ?? "";
    try {
      const parsed = parseResponse(content);
      return {
        ...parsed,
        rawResponse: content,
        model: response.model ?? "gpt-4.1-mini",
      };
    } catch (error) {
      if (retry) {
        throw error;
      }
      const retryMessages = [
        ...messages,
        { role: "system" as const, content: "Return valid JSON only." },
      ];
      return attemptRequest(retryMessages, true);
    }
  };

  return attemptRequest(baseMessages);
};

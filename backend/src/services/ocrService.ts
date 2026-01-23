import pdf from "pdf-parse";
import OpenAI from "openai";
import { env } from "../lib/env.js";

export interface SensitiveMatch {
  matched: boolean;
  reason?: string;
}

const sensitivePatterns: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /password/i, reason: "Contains a password" },
  { pattern: /passphrase/i, reason: "Contains a passphrase" },
  { pattern: /ssn|social security/i, reason: "Contains a Social Security number" },
  { pattern: /passport/i, reason: "Contains a passport number" },
  { pattern: /visa/i, reason: "Contains a visa identifier" },
  { pattern: /driver'?s license/i, reason: "Contains a driver's license identifier" },
  { pattern: /bank account|account number/i, reason: "Contains a bank account number" },
  { pattern: /credit card|debit card|card number/i, reason: "Contains a card number" },
  { pattern: /routing number/i, reason: "Contains a routing number" },
  { pattern: /pin\b/i, reason: "Contains a PIN" },
  { pattern: /api key|secret key/i, reason: "Contains an API key" },
];

export const detectSensitiveContent = (text: string): SensitiveMatch => {
  const normalized = text.trim();
  if (!normalized) {
    return { matched: false };
  }
  const match = sensitivePatterns.find(({ pattern }) => pattern.test(normalized));
  if (!match) {
    return { matched: false };
  }
  return { matched: true, reason: match.reason };
};

export const detectSensitiveDocument = ({
  text,
  fileName,
}: {
  text: string;
  fileName?: string | null;
}): SensitiveMatch => {
  const combined = [fileName ?? "", text].join("\n");
  return detectSensitiveContent(combined);
};

export interface PdfTextResult {
  text: string;
  pages: string[];
}

export const extractTextFromPdfBuffer = async (buffer: Buffer): Promise<PdfTextResult> => {
  const pages: string[] = [];
  const parsed = await pdf(buffer, {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .trim();
      pages.push(pageText);
      return pageText;
    },
  });

  return { text: parsed.text ?? "", pages };
};

const createClient = () => {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
};

const buildOcrPrompt = () =>
  [
    "Extract all readable text exactly as seen.",
    "Preserve line breaks and spacing where possible.",
    "Do not invent or infer missing text.",
    "Return plain text only.",
  ].join(" ");

export const extractTextFromImageWithOpenAI = async ({
  buffer,
  mimeType,
}: {
  buffer: Buffer;
  mimeType: string;
}) => {
  const client = createClient();
  const base64 = buffer.toString("base64");
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: buildOcrPrompt() },
      {
        role: "user",
        content: [
          { type: "text", text: "OCR this document image." },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 1200,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
};

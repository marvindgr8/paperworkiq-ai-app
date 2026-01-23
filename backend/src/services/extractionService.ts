import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { runCategorization } from "./categorizationService.js";

const fieldSchema = z.object({
  key: z.string().min(1),
  valueText: z.string().optional(),
  valueNumber: z.number().optional(),
  valueDate: z.string().optional(),
  confidence: z.number().optional(),
  sourceSnippet: z.string().optional(),
  sourcePage: z.number().optional(),
});

const extractionSchema = z.object({
  fields: z.array(fieldSchema).default([]),
  summary: z.string().optional(),
});

const createClient = () => {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
};

const buildExtractionPrompt = (text: string) => {
  return [
    "Extract structured fields from the OCR text.",
    "Return STRICT JSON with shape: { fields: [{ key, valueText, valueNumber, valueDate, confidence, sourceSnippet, sourcePage }], summary }.",
    "Only include fields that are supported by the text. Use ISO dates (YYYY-MM-DD) for valueDate.",
    "If unsure, omit the field. Keep sourceSnippet short (<= 160 chars).",
    "OCR Text:",
    text.slice(0, 6000),
  ].join("\n");
};

const extractJson = (content: string) => {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in response");
  }
  return content.slice(start, end + 1);
};

const parseExtractionResponse = (content: string) => {
  const json = JSON.parse(extractJson(content));
  return extractionSchema.parse(json);
};

const toDateValue = (value?: string) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

export const runExtraction = async (documentId: string) => {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    return { ok: false, error: "Document not found" };
  }

  await prisma.document.update({
    where: { id: document.id },
    data: { status: "PROCESSING" },
  });

  if (!document.rawText || !document.rawText.trim()) {
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "READY", extractData: { fields: [] } },
    });
    return { ok: true, documentId: document.id };
  }

  let extractionResult: z.infer<typeof extractionSchema> = { fields: [] };

  try {
    const client = createClient();
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You extract structured data from OCR text. Output strict JSON only. Do not include markdown.",
        },
        { role: "user", content: buildExtractionPrompt(document.rawText) },
      ],
      temperature: 0.2,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content ?? "";
    extractionResult = parseExtractionResponse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed";
    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "FAILED",
        aiMetaJson: JSON.stringify({ error: message }),
      },
    });
    return { ok: false, error: message };
  }

  await prisma.extractedField.deleteMany({ where: { documentId: document.id } });

  if (extractionResult.fields.length > 0) {
    await prisma.extractedField.createMany({
      data: extractionResult.fields.map((field) => ({
        documentId: document.id,
        key: field.key,
        valueText: field.valueText ?? null,
        valueNumber: field.valueNumber ?? null,
        valueDate: toDateValue(field.valueDate),
        confidence: field.confidence ?? null,
        sourceSnippet: field.sourceSnippet ?? null,
        sourcePage: field.sourcePage ?? null,
      })),
    });
  }

  await prisma.document.update({
    where: { id: document.id },
    data: {
      status: "READY",
      extractData: extractionResult,
    },
  });

  try {
    await runCategorization(document.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Categorization failed";
    await prisma.document.update({
      where: { id: document.id },
      data: { aiStatus: "FAILED", aiMetaJson: JSON.stringify({ error: message }) },
    });
  }

  return { ok: true, documentId: document.id };
};

export const enqueueExtraction = (documentId: string) => {
  setTimeout(() => {
    void runExtraction(documentId);
  }, 0);
};

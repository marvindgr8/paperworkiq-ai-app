import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { runCategorization } from "./categorizationService.js";

const extractedFieldSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().optional(),
});

const importantDateSchema = z.object({
  label: z.string().min(1),
  date: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
});

const amountSchema = z.object({
  label: z.string().min(1),
  value: z.number(),
  currency: z.string().min(1),
});

const extractionSchema = z.object({
  documentType: z.string().optional(),
  summary: z.string().optional(),
  extractedFields: z.array(extractedFieldSchema).default([]),
  importantDates: z.array(importantDateSchema).default([]),
  amounts: z.array(amountSchema).default([]),
});

const createClient = () => {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
};

const buildExtractionPrompt = (text: string, metadata: Record<string, string | number | null>) => {
  return [
    "Extract structured fields from the OCR text.",
    "Return STRICT JSON with shape:",
    "{ documentType, summary, extractedFields: [{ label, value, confidence, source }], importantDates: [{ label, date, confidence }], amounts: [{ label, value, currency }] }.",
    "Only include fields that are supported by the text. Use ISO dates (YYYY-MM-DD) for date.",
    "If unsure, omit the field. Keep source short (<= 160 chars).",
    "Document metadata:",
    JSON.stringify(metadata),
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

  if (!document.ocrText || !document.ocrText.trim()) {
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "READY", extractData: { extractedFields: [], importantDates: [], amounts: [] } },
    });
    return { ok: true, documentId: document.id };
  }

  let extractionResult: z.infer<typeof extractionSchema> = {
    extractedFields: [],
    importantDates: [],
    amounts: [],
  };

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
        {
          role: "user",
          content: buildExtractionPrompt(document.ocrText, {
            title: document.title ?? null,
            fileName: document.fileName ?? null,
            mimeType: document.mimeType ?? null,
            sizeBytes: document.sizeBytes ?? null,
          }),
        },
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

  const extractedFieldRows = [
    ...extractionResult.extractedFields.map((field) => ({
      documentId: document.id,
      key: field.label,
      valueText: field.value ?? null,
      confidence: field.confidence ?? null,
      sourceSnippet: field.source ?? null,
    })),
    ...extractionResult.importantDates.map((field) => ({
      documentId: document.id,
      key: field.label,
      valueDate: toDateValue(field.date),
      valueText: field.date ?? null,
      confidence: field.confidence ?? null,
    })),
    ...extractionResult.amounts.map((field) => ({
      documentId: document.id,
      key: field.label,
      valueNumber: field.value,
      valueText: field.currency ?? null,
    })),
  ];

  if (extractedFieldRows.length > 0) {
    await prisma.extractedField.createMany({
      data: extractedFieldRows,
    });
  }

  await prisma.document.update({
    where: { id: document.id },
    data: {
      status: "READY",
      extractData: extractionResult,
      type: extractionResult.documentType ?? null,
      summary: extractionResult.summary ?? null,
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

import fs from "node:fs/promises";
import crypto from "node:crypto";
import { createCanvas } from "canvas";
import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import {
  detectSensitiveDocument,
  extractTextFromImageWithOpenAI,
  extractTextFromPdfBuffer,
} from "./ocrService.js";
import { readStoredFile } from "./storageService.js";

const extractionFieldSchema = z.object({
  key: z.string().min(1),
  valueText: z.string().nullable().optional(),
  valueNumber: z.number().nullable().optional(),
  valueDate: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  sourceSnippet: z.string().nullable().optional(),
  sourcePage: z.number().int().nullable().optional(),
});

const extractionSchema = z.object({
  title: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  fields: z.array(extractionFieldSchema).default([]),
});

const createClient = () => {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
};

const normalizeWhitespace = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const wordCount = (text: string) => {
  if (!text.trim()) {
    return 0;
  }
  return text.trim().split(/\s+/).length;
};

const shouldUseVisionOcr = (text: string) => wordCount(text) < 20;

const buildExtractionPrompt = (text: string, isSensitive: boolean) => {
  return [
    "You extract structured fields from OCR text.",
    "Return STRICT JSON only with shape:",
    '{ "title": string|null, "category": string|null, "fields": [{ "key": string, "valueText": string|null, "valueNumber": number|null, "valueDate": "YYYY-MM-DD"|null, "confidence": 0-1, "sourceSnippet": string|null, "sourcePage": number|null }] }',
    "Rules:",
    "- Only include fields you can justify from the text.",
    "- Keep sourceSnippet short (<= 160 chars).",
    "- Use ISO dates (YYYY-MM-DD).",
    "- Never output passports, passwords, secret tokens, or highly sensitive identifiers as fields.",
    isSensitive
      ? "- Sensitive document detected: only include low-risk fields (document type, expiry date) and keep confidence low."
      : "- If unsure, omit the field.",
    "",
    "OCR text:",
    text.slice(0, 10000),
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

const allowedSensitiveFields = [/document type/i, /expiry/i, /expiration/i];

const filterSensitiveFields = (fields: z.infer<typeof extractionFieldSchema>[]) =>
  fields.filter((field) => allowedSensitiveFields.some((pattern) => pattern.test(field.key)));

const parseDateValue = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const renderPdfPage = async (pdf: { getPage: (pageNumber: number) => Promise<any> }, pageNumber: number) => {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toBuffer("image/png");
};

const ocrPdfWithVision = async (buffer: Buffer, maxPages = 3) => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pageCount = pdf.numPages;
  const pages: string[] = [];
  const client = createClient();

  for (let pageNumber = 1; pageNumber <= Math.min(pageCount, maxPages); pageNumber += 1) {
    const imageBuffer = await renderPdfPage(pdf, pageNumber);
    const base64 = imageBuffer.toString("base64");
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Extract all readable text exactly as seen. Preserve lines. Do not invent. Return plain text only.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: `OCR page ${pageNumber} of this PDF.` },
            { type: "image_url", image_url: { url: `data:image/png;base64,${base64}` } },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 1200,
    });
    pages.push(response.choices[0]?.message?.content?.trim() ?? "");
  }

  return pages;
};

const computeFileHash = async (filePath: string) => {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
};

export const processDocument = async (documentId: string) => {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    return { ok: false, error: "Document not found" };
  }

  await prisma.document.update({
    where: { id: document.id },
    data: { status: "PROCESSING", aiStatus: "PENDING", processingError: null },
  });

  if (!document.storageKey) {
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "FAILED", processingError: "Missing storage key.", processedAt: new Date() },
    });
    return { ok: false, error: "Missing storage key." };
  }

  try {
    const buffer = await readStoredFile(document.storageKey);

    let text = "";
    let pages: string[] = [];
    if (document.mimeType === "application/pdf") {
      const pdfText = await extractTextFromPdfBuffer(buffer);
      text = pdfText.text;
      pages = pdfText.pages;
      if (shouldUseVisionOcr(text)) {
        const ocrPages = await ocrPdfWithVision(buffer);
        pages = ocrPages;
        text = ocrPages.join("\n\n");
      }
    } else if (document.mimeType?.startsWith("image/")) {
      text = await extractTextFromImageWithOpenAI({ buffer, mimeType: document.mimeType });
      pages = text ? [text] : [];
    } else {
      throw new Error("Unsupported file type for OCR.");
    }

    const normalizedText = normalizeWhitespace(text);
    const sensitiveMatch = detectSensitiveDocument({
      text: normalizedText,
      fileName: document.fileName,
    });

    let extractionResult: z.infer<typeof extractionSchema> = {
      title: null,
      category: null,
      fields: [],
    };

    if (normalizedText) {
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
            content: buildExtractionPrompt(normalizedText, sensitiveMatch.matched),
          },
        ],
        temperature: 0.2,
        max_tokens: 800,
      });
      extractionResult = parseExtractionResponse(response.choices[0]?.message?.content ?? "");
    }

    const fields = sensitiveMatch.matched
      ? filterSensitiveFields(extractionResult.fields)
      : extractionResult.fields;
    const safeExtractionResult = { ...extractionResult, fields };

    await prisma.extractedField.deleteMany({ where: { documentId: document.id } });
    if (fields.length > 0) {
      await prisma.extractedField.createMany({
        data: fields.map((field) => ({
          documentId: document.id,
          key: field.key,
          valueText: field.valueText ?? null,
          valueNumber: field.valueNumber ?? null,
          valueDate: parseDateValue(field.valueDate ?? null),
          confidence: field.confidence ?? null,
          sourceSnippet: field.sourceSnippet ?? null,
          sourcePage: field.sourcePage ?? null,
        })),
      });
    }

    const normalizedCategory = extractionResult.category?.trim() || null;
    const resolvedTitle =
      document.title && document.title !== document.fileName
        ? document.title
        : extractionResult.title?.trim() || document.title;

    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "READY",
        aiStatus: "READY",
        categoryLabel: normalizedCategory,
        title: resolvedTitle ?? document.title,
        rawText: normalizedText,
        ocrPages: pages,
        extractData: safeExtractionResult,
        processedAt: new Date(),
        sensitiveDetected: sensitiveMatch.matched,
        processingError: null,
      },
    });

    return { ok: true, documentId: document.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed";
    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "FAILED",
        aiStatus: "FAILED",
        processingError: message,
        processedAt: new Date(),
      },
    });
    return { ok: false, error: message };
  }
};

export const enqueueDocumentProcessing = (documentId: string) => {
  setTimeout(() => {
    void processDocument(documentId);
  }, 0);
};

export const computeDocumentFileHash = async (filePath: string) => computeFileHash(filePath);

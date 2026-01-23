import fs from "node:fs/promises";
import pdf from "pdf-parse";
import { createWorker } from "tesseract.js";

export interface SensitiveMatch {
  matched: boolean;
  reason?: string;
}

const sensitivePatterns: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /password/i, reason: "Contains a password" },
  { pattern: /passphrase/i, reason: "Contains a passphrase" },
  { pattern: /ssn|social security/i, reason: "Contains a Social Security number" },
  { pattern: /passport/i, reason: "Contains a passport number" },
  { pattern: /bank account|account number/i, reason: "Contains a bank account number" },
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

export const extractTextFromImage = async (filePath: string) => {
  const worker = await createWorker("eng");
  const result = await worker.recognize(filePath);
  await worker.terminate();
  return result.data.text ?? "";
};

export interface PdfTextResult {
  text: string;
  pages: string[];
}

export const extractTextFromPdf = async (filePath: string): Promise<PdfTextResult> => {
  const buffer = await fs.readFile(filePath);
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

import { prisma } from "../lib/prisma.js";
import { categorizeDocumentWithOpenAI } from "./openaiCategorizer.js";

const normalizeCategoryName = (name: string) => {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "";
  }
  const titleCased = trimmed
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
  return titleCased.slice(0, 40);
};

const buildSnippet = (rawText?: string | null) => {
  if (!rawText) {
    return null;
  }
  return rawText.slice(0, 500);
};

export const runCategorization = async (documentId: string) => {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { category: true },
  });

  if (!document) {
    return { ok: false, error: "Document not found" };
  }

  await prisma.document.update({
    where: { id: document.id },
    data: { aiStatus: "CATEGORIZING" },
  });

  const existingCategories = await prisma.category.findMany({
    where: { workspaceId: document.workspaceId },
    select: { id: true, name: true },
  });

  try {
    const result = await categorizeDocumentWithOpenAI({
      documentId: document.id,
      workspaceId: document.workspaceId,
      filename: document.fileName ?? document.title ?? "Untitled",
      uploadedNote: document.title ?? null,
      issuer: null,
      extractedTextSnippet: buildSnippet(document.rawText ?? document.ocrText),
      existingCategories: existingCategories.map((category) => category.name),
    });

    const normalizedName = normalizeCategoryName(result.categoryName);
    const matchedCategory = normalizedName
      ? existingCategories.find(
          (category) => normalizeCategoryName(category.name) === normalizedName,
        )
      : null;

    const updatedDocument = await prisma.document.update({
      where: { id: document.id },
      data: {
        categoryId: matchedCategory?.id ?? null,
        categoryLabel: normalizedName || null,
        aiStatus: "READY",
        aiConfidence: result.confidence,
        aiMetaJson: JSON.stringify({
          rationale: result.rationale,
          reuseExisting: result.reuseExisting,
          rawResponse: result.rawResponse,
          model: result.model,
        }),
      },
      include: { category: true },
    });

    return { ok: true, document: updatedDocument };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Categorization failed";
    await prisma.document.update({
      where: { id: document.id },
      data: {
        aiStatus: "FAILED",
        aiMetaJson: JSON.stringify({ error: message }),
      },
    });
    return { ok: false, error: message };
  }
};

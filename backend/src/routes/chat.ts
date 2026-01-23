import { Router } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth.js";
import { ensureWorkspaceAccess, getAccessibleWorkspace } from "../lib/workspace.js";
import { env } from "../lib/env.js";

export const chatRouter = Router();

const createSessionSchema = z.object({
  workspaceId: z.string().optional(),
});

const messageSchema = z.object({
  content: z.string().min(1),
  documentId: z.string().optional(),
});

const getWorkspaceIdFromQuery = (workspaceId: string | string[] | undefined) => {
  if (Array.isArray(workspaceId)) {
    return workspaceId[0];
  }
  return workspaceId;
};

chatRouter.use(requireAuth);

chatRouter.get(
  "/sessions",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const workspace = await getAccessibleWorkspace(
      userId,
      getWorkspaceIdFromQuery(req.query.workspaceId)
    );
    if (!workspace) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const sessions = await prisma.chatSession.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });

    res.json({ ok: true, sessions });
  })
);

chatRouter.post(
  "/sessions",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const data = createSessionSchema.parse(req.body ?? {});
    const workspace = await getAccessibleWorkspace(userId, data.workspaceId);
    if (!workspace) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const session = await prisma.chatSession.create({
      data: { userId, workspaceId: workspace.id },
      select: { id: true, createdAt: true },
    });

    res.status(201).json({ ok: true, session });
  })
);

chatRouter.get(
  "/sessions/:id/messages",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const session = await prisma.chatSession.findUnique({
      where: { id: req.params.id },
      select: { id: true, workspaceId: true },
    });

    if (!session) {
      return res.status(404).json({ ok: false, error: "Session not found" });
    }

    const canAccess = await ensureWorkspaceAccess(userId, session.workspaceId);
    if (!canAccess) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
      include: { citations: { include: { document: true } } },
    });

    const normalizedMessages = messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
      citations: message.citations.map((citation) => ({
        documentId: citation.documentId,
        documentTitle:
          citation.document.title ?? citation.document.fileName ?? "Document",
        page: citation.page ?? undefined,
        snippet: citation.snippet ?? undefined,
        field: citation.field ?? undefined,
      })),
    }));

    res.json({ ok: true, messages: normalizedMessages });
  })
);

chatRouter.post(
  "/sessions/:id/messages",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const data = messageSchema.parse(req.body);

    const session = await prisma.chatSession.findUnique({
      where: { id: req.params.id },
      select: { id: true, workspaceId: true },
    });

    if (!session) {
      return res.status(404).json({ ok: false, error: "Session not found" });
    }

    const canAccess = await ensureWorkspaceAccess(userId, session.workspaceId);
    if (!canAccess) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "USER",
        content: data.content,
      },
    });

    type DocumentContext = {
      id: string;
      title: string | null;
      fileName: string | null;
      rawText: string | null;
      ocrPages: unknown;
      fields: Array<{
        key: string;
        valueText: string | null;
        valueNumber: number | null;
        valueDate: Date | null;
        confidence: number | null;
        sourcePage: number | null;
        sourceSnippet: string | null;
      }>;
      mimeType: string | null;
    };

    const docs: DocumentContext[] = data.documentId
      ? []
      : await prisma.document.findMany({
          where: { workspaceId: session.workspaceId },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            fileName: true,
            rawText: true,
            ocrPages: true,
            fields: true,
            mimeType: true,
          },
        });

    let scopedDocument: DocumentContext | null = null;

    if (data.documentId) {
      const document = await prisma.document.findUnique({
        where: { id: data.documentId },
        select: {
          id: true,
          title: true,
          fileName: true,
          rawText: true,
          ocrPages: true,
          fields: true,
          mimeType: true,
          workspaceId: true,
        },
      });

      if (!document) {
        return res.status(404).json({ ok: false, error: "Document not found" });
      }

      const canAccessDoc = await ensureWorkspaceAccess(userId, document.workspaceId);
      if (!canAccessDoc || document.workspaceId !== session.workspaceId) {
        return res.status(403).json({ ok: false, error: "Workspace access denied" });
      }

      scopedDocument = {
        id: document.id,
        title: document.title,
        fileName: document.fileName,
        rawText: document.rawText,
        ocrPages: document.ocrPages,
        fields: document.fields,
        mimeType: document.mimeType,
      };

      docs.push(scopedDocument);
    }

    const keywords = Array.from(
      new Set(
        data.content
          .toLowerCase()
          .split(/\\W+/)
          .filter((word) => word.length > 3)
      )
    );

    const buildSnippet = (text: string, keyword: string) => {
      const lower = text.toLowerCase();
      const index = lower.indexOf(keyword);
      if (index === -1) {
        return null;
      }
      const start = Math.max(0, index - 80);
      const end = Math.min(text.length, index + 120);
      return text.slice(start, end).trim();
    };

    const normalizePages = (pages: unknown): string[] => {
      if (!Array.isArray(pages)) {
        return [];
      }
      return pages.filter((page): page is string => typeof page === "string");
    };

    const findFieldMatch = (
      fields: DocumentContext["fields"],
      keywordList: string[]
    ): { label: string; value: string } | null => {
      if (!fields || fields.length === 0) {
        return null;
      }
      const candidates = fields.map((field) => {
        const value =
          field.valueText ??
          (field.valueNumber !== null ? String(field.valueNumber) : null) ??
          (field.valueDate ? field.valueDate.toISOString().slice(0, 10) : null) ??
          "";
        return { label: field.key, value };
      });
      const lowerKeywords = keywordList.map((keyword) => keyword.toLowerCase());
      return (
        candidates.find((field) => {
          const label = field.label.toLowerCase();
          const value = field.value.toLowerCase();
          return lowerKeywords.some((keyword) => label.includes(keyword) || value.includes(keyword));
        }) ?? null
      );
    };

    const citations: Array<{
      documentId: string;
      documentTitle: string;
      page?: number;
      snippet?: string;
      field?: string;
    }> = [];

    for (const doc of docs) {
      const title = doc.title ?? doc.fileName ?? "Document";
      const ocrText = doc.rawText ?? "";
      const pages = normalizePages(doc.ocrPages);
      let snippet: string | null = null;
      let page: number | undefined = undefined;

      if (pages.length > 0) {
        for (let i = 0; i < pages.length; i += 1) {
          for (const keyword of keywords) {
            snippet = buildSnippet(pages[i], keyword);
            if (snippet) {
              page = i + 1;
              break;
            }
          }
          if (snippet) {
            break;
          }
        }
      }

      if (!snippet) {
        for (const keyword of keywords) {
          snippet = buildSnippet(ocrText, keyword);
          if (snippet) {
            break;
          }
        }
      }

      if (!snippet) {
        const matchedField = findFieldMatch(doc.fields, keywords);
        if (matchedField) {
          snippet = `${matchedField.label}: ${matchedField.value}`;
          citations.push({
            documentId: doc.id,
            documentTitle: title,
            field: matchedField.label,
            snippet,
          });
        }
      }

      for (const keyword of keywords) {
        snippet = snippet ?? buildSnippet(ocrText, keyword);
        if (snippet) {
          break;
        }
      }
      if (snippet && !citations.some((citation) => citation.documentId === doc.id)) {
        citations.push({
          documentId: doc.id,
          documentTitle: title,
          page,
          snippet,
        });
      }
      if (citations.length >= 3) {
        break;
      }
    }

    const isDocumentScoped = Boolean(data.documentId);

    let responseText =
      citations.length === 0
        ? isDocumentScoped
          ? "I couldn't find a matching passage in this document yet."
          : "I couldn't find a matching passage in your documents yet."
        : "I’ve pulled the most relevant passages and will answer with citations.";

    const selectedDocument = scopedDocument ?? docs[0];
    const documentTitle = selectedDocument?.title ?? selectedDocument?.fileName ?? "Document";
    const ocrText = selectedDocument?.rawText ?? "";
    const extractedFields = selectedDocument?.fields ?? [];

    if (isDocumentScoped && (!selectedDocument || !ocrText.trim())) {
      const assistantMessage = await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: "ASSISTANT",
          content: "I can’t read the document yet—processing is still running.",
        },
        select: { id: true, role: true, content: true, createdAt: true },
      });

      return res.status(201).json({ ok: true, message: assistantMessage, citations: [] });
    }

    if (
      env.OPENAI_API_KEY &&
      selectedDocument &&
      (isDocumentScoped ? Boolean(ocrText || citations.length > 0) : citations.length > 0)
    ) {
      const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      const context = citations
        .map(
          (citation, index) =>
            `[${index + 1}] Document: ${citation.documentTitle} (id: ${citation.documentId}) page ${
              citation.page ?? "n/a"
            } snippet: ${citation.snippet ?? ""}`
        )
        .join("\n");

      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: isDocumentScoped
          ? [
              {
                role: "system",
                content:
                  "You are a document-specific assistant. Use only the provided document data. If the answer is not in the document, say you are not sure. Cite evidence when possible. Return STRICT JSON with { answer, citations: [{ documentId, documentTitle, page, snippet, field }] }.",
              },
              {
                role: "user",
                content: [
                  `Question: ${data.content}`,
                  `Document: ${documentTitle} (id: ${selectedDocument.id})`,
                  "Extracted fields:",
                  JSON.stringify(extractedFields).slice(0, 4000),
                  "OCR text:",
                  ocrText.slice(0, 6000),
                  context ? `Snippets:\n${context}` : "",
                ]
                  .filter(Boolean)
                  .join("\n\n"),
              },
            ]
          : [
              {
                role: "system",
                content:
                  "Answer the user using only the provided snippets. Return STRICT JSON with { answer, citations: [{ documentId, documentTitle, page, snippet, field }] }.",
              },
              {
                role: "user",
                content: `Question: ${data.content}\n\nSnippets:\n${context}`,
              },
            ],
        temperature: 0.2,
        max_tokens: 400,
      });

      const content = response.choices[0]?.message?.content ?? "";
      const jsonStart = content.indexOf("{");
      const jsonEnd = content.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        try {
          const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
          responseText = parsed.answer ?? responseText;
          if (Array.isArray(parsed.citations)) {
            const docTitles = new Map(
              docs.map((doc) => [doc.id, doc.title ?? doc.fileName ?? "Document"])
            );
            const normalized = parsed.citations.map((citation) => ({
              ...citation,
              documentTitle:
                citation.documentTitle ?? docTitles.get(citation.documentId) ?? "Document",
            }));
            citations.splice(0, citations.length, ...normalized);
          }
        } catch (error) {
          // ignore parse errors and keep fallback response
        }
      }
    }

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "ASSISTANT",
        content: responseText,
      },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    if (citations.length > 0) {
      await prisma.chatCitation.createMany({
        data: citations.map((citation) => ({
          messageId: assistantMessage.id,
          documentId: citation.documentId,
          page: citation.page ?? null,
          field: citation.field ?? null,
          snippet: citation.snippet ?? null,
        })),
      });
    }

    res.status(201).json({ ok: true, message: assistantMessage, citations });
  })
);

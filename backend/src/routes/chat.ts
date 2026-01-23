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

    const docs = await prisma.document.findMany({
      where: { workspaceId: session.workspaceId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        fileName: true,
        rawText: true,
        extractData: true,
      },
    });

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

    const citations: Array<{
      documentId: string;
      documentTitle: string;
      page?: number;
      snippet?: string;
      field?: string;
    }> = [];

    for (const doc of docs) {
      const title = doc.title ?? doc.fileName ?? "Document";
      const rawText = doc.rawText ?? "";
      let snippet: string | null = null;
      for (const keyword of keywords) {
        snippet = buildSnippet(rawText, keyword);
        if (snippet) {
          break;
        }
      }
      if (!snippet && doc.extractData) {
        const extractString = JSON.stringify(doc.extractData);
        for (const keyword of keywords) {
          snippet = buildSnippet(extractString, keyword);
          if (snippet) {
            break;
          }
        }
      }
      if (snippet) {
        citations.push({
          documentId: doc.id,
          documentTitle: title,
          page: 1,
          snippet,
        });
      }
      if (citations.length >= 3) {
        break;
      }
    }

    let responseText =
      citations.length === 0
        ? "I couldn't find a matching passage in your documents yet."
        : "I’ve pulled the most relevant passages and will answer with citations.";

    if (env.OPENAI_API_KEY && citations.length > 0) {
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
        messages: [
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

import { Router } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { ChatScope, DocumentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth.js";
import { ensureWorkspaceAccess, getAccessibleWorkspace } from "../lib/workspace.js";
import { env } from "../lib/env.js";

export const chatRouter = Router();

type HomeScopeType = "folder" | "selection";

type ScopePayload = {
  scopeType: HomeScopeType;
  rootFolderId: string | null;
  fileIds: string[];
  folderIds: string[];
  includeSubfolders: boolean;
};

const chatScopeSchema = z.enum([ChatScope.WORKSPACE, ChatScope.DOCUMENT]);

const homeScopeSchema = z.object({
  scopeType: z.enum(["folder", "selection"]),
  rootFolderId: z.string().nullable().optional(),
  fileIds: z.array(z.string()).default([]),
  folderIds: z.array(z.string()).default([]),
  includeSubfolders: z.boolean().default(false),
});

const createSessionSchema = z.object({
  workspaceId: z.string().optional(),
  scope: chatScopeSchema.optional(),
  documentId: z.string().optional(),
  folderId: z.string().optional(),
  scopeType: z.enum(["folder", "selection"]).optional(),
  rootFolderId: z.string().nullable().optional(),
  fileIds: z.array(z.string()).optional(),
  folderIds: z.array(z.string()).optional(),
  includeSubfolders: z.boolean().optional(),
});

const messageSchema = z.object({
  content: z.string().min(1),
  scope: chatScopeSchema.optional(),
  documentId: z.string().optional(),
  folderId: z.string().optional(),
});

const querySchema = z.object({
  scope: chatScopeSchema.optional(),
  documentId: z.string().optional(),
  folderId: z.string().optional(),
});

const getQueryParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const resolveLegacyScope = (scope?: ChatScope, documentId?: string | null) => {
  if (scope) {
    return scope;
  }
  return documentId ? ChatScope.DOCUMENT : ChatScope.WORKSPACE;
};

const toScopePayload = (data: z.infer<typeof createSessionSchema>): ScopePayload => {
  if (data.scopeType) {
    const parsed = homeScopeSchema.parse(data);
    return {
      scopeType: parsed.scopeType,
      rootFolderId: parsed.rootFolderId ?? null,
      fileIds: parsed.fileIds,
      folderIds: parsed.folderIds,
      includeSubfolders: parsed.includeSubfolders,
    };
  }

  if (data.scope === ChatScope.DOCUMENT && data.documentId) {
    return {
      scopeType: "selection",
      rootFolderId: null,
      fileIds: [data.documentId],
      folderIds: [],
      includeSubfolders: false,
    };
  }

  return {
    scopeType: "folder",
    rootFolderId: data.folderId ?? null,
    fileIds: [],
    folderIds: [],
    includeSubfolders: false,
  };
};

const getFolderDescendants = async (
  workspaceId: string,
  folderId: string
): Promise<string[]> => {
  const descendants: string[] = [];
  const queue = [folderId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    const children = await prisma.folder.findMany({
      where: { workspaceId, parentId: current },
      select: { id: true },
    });
    for (const child of children) {
      descendants.push(child.id);
      queue.push(child.id);
    }
  }

  return descendants;
};

const getFilesInFolders = async (
  workspaceId: string,
  folderIds: string[]
): Promise<string[]> => {
  if (folderIds.length === 0) {
    return [];
  }
  const docs = await prisma.document.findMany({
    where: { workspaceId, folderId: { in: folderIds } },
    select: { id: true },
  });
  return docs.map((doc) => doc.id);
};

const resolveCandidateFileIds = async (sessionId: string): Promise<string[]> => {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: {
      sessionFiles: { select: { fileId: true } },
      sessionFolders: { select: { folderId: true } },
    },
  });

  if (!session) {
    return [];
  }

  if (session.scopeType === "selection") {
    const folderRoots = session.sessionFolders.map((item) => item.folderId);
    const expandedFolders = new Set<string>(folderRoots);
    for (const rootId of folderRoots) {
      const descendants = await getFolderDescendants(session.workspaceId, rootId);
      descendants.forEach((id) => expandedFolders.add(id));
    }

    const folderFiles = await getFilesInFolders(session.workspaceId, [...expandedFolders]);
    return Array.from(
      new Set([...session.sessionFiles.map((file) => file.fileId), ...folderFiles])
    );
  }

  if (!session.rootFolderId) {
    const docs = await prisma.document.findMany({
      where: { workspaceId: session.workspaceId },
      select: { id: true },
    });
    return docs.map((doc) => doc.id);
  }

  const folderIds = [session.rootFolderId];
  if (session.includeSubfolders) {
    const descendants = await getFolderDescendants(session.workspaceId, session.rootFolderId);
    folderIds.push(...descendants);
  }

  return getFilesInFolders(session.workspaceId, folderIds);
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
      getQueryParam(req.query.workspaceId)
    );
    if (!workspace) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const rawScope = getQueryParam(req.query.scope);
    const rawDocumentId = getQueryParam(req.query.documentId);
    const rawFolderId = getQueryParam(req.query.folderId);
    const query = querySchema.parse({ scope: rawScope, documentId: rawDocumentId, folderId: rawFolderId });
    const scope = resolveLegacyScope(query.scope, query.documentId);

    if (scope === ChatScope.DOCUMENT && !query.documentId) {
      return res.status(400).json({ ok: false, error: "Document scope requires documentId" });
    }

    const sessions = await prisma.chatSession.findMany({
      where: {
        workspaceId: workspace.id,
        scope,
        ...(scope === ChatScope.DOCUMENT && query.documentId
          ? { documentId: query.documentId }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        scope: true,
        documentId: true,
        scopeType: true,
        rootFolderId: true,
        includeSubfolders: true,
      },
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

    const legacyScope = resolveLegacyScope(data.scope, data.documentId);
    const scopePayload = toScopePayload(data);

    if (legacyScope === ChatScope.DOCUMENT && data.documentId) {
      const doc = await prisma.document.findUnique({ where: { id: data.documentId } });
      if (!doc || doc.workspaceId !== workspace.id) {
        return res.status(404).json({ ok: false, error: "Document not found" });
      }
    }

    if (scopePayload.rootFolderId) {
      const rootFolder = await prisma.folder.findUnique({ where: { id: scopePayload.rootFolderId } });
      if (!rootFolder || rootFolder.workspaceId !== workspace.id) {
        return res.status(404).json({ ok: false, error: "Folder not found" });
      }
    }

    if (scopePayload.folderIds.length > 0) {
      const folderCount = await prisma.folder.count({
        where: { id: { in: scopePayload.folderIds }, workspaceId: workspace.id },
      });
      if (folderCount !== new Set(scopePayload.folderIds).size) {
        return res.status(404).json({ ok: false, error: "One or more folders were not found" });
      }
    }

    if (scopePayload.fileIds.length > 0) {
      const docCount = await prisma.document.count({
        where: { id: { in: scopePayload.fileIds }, workspaceId: workspace.id },
      });
      if (docCount !== new Set(scopePayload.fileIds).size) {
        return res.status(404).json({ ok: false, error: "One or more files were not found" });
      }
    }

    const session = await prisma.chatSession.create({
      data: {
        userId,
        workspaceId: workspace.id,
        scope: legacyScope,
        documentId: legacyScope === ChatScope.DOCUMENT ? data.documentId : null,
        scopeType: scopePayload.scopeType,
        rootFolderId: scopePayload.scopeType === "folder" ? scopePayload.rootFolderId : null,
        includeSubfolders: scopePayload.scopeType === "folder" ? scopePayload.includeSubfolders : false,
        sessionFiles:
          scopePayload.scopeType === "selection" && scopePayload.fileIds.length > 0
            ? {
                createMany: {
                  data: scopePayload.fileIds.map((fileId) => ({ fileId })),
                  skipDuplicates: true,
                },
              }
            : undefined,
        sessionFolders:
          scopePayload.scopeType === "selection" && scopePayload.folderIds.length > 0
            ? {
                createMany: {
                  data: scopePayload.folderIds.map((folderId) => ({ folderId })),
                  skipDuplicates: true,
                },
              }
            : undefined,
      },
      select: {
        id: true,
        createdAt: true,
        scope: true,
        documentId: true,
        scopeType: true,
        rootFolderId: true,
        includeSubfolders: true,
      },
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
      select: { id: true, workspaceId: true, scope: true, documentId: true },
    });

    if (!session) {
      return res.status(404).json({ ok: false, error: "Session not found" });
    }

    const canAccess = await ensureWorkspaceAccess(userId, session.workspaceId);
    if (!canAccess) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const rawScope = getQueryParam(req.query.scope);
    const rawDocumentId = getQueryParam(req.query.documentId);
    const rawFolderId = getQueryParam(req.query.folderId);
    const query = querySchema.parse({ scope: rawScope, documentId: rawDocumentId, folderId: rawFolderId });
    const scope = resolveLegacyScope(query.scope, query.documentId ?? session.documentId);

    if (scope !== session.scope) {
      return res.status(400).json({ ok: false, error: "Session scope mismatch" });
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
      select: {
        id: true,
        workspaceId: true,
        scope: true,
        documentId: true,
      },
    });

    if (!session) {
      return res.status(404).json({ ok: false, error: "Session not found" });
    }

    const canAccess = await ensureWorkspaceAccess(userId, session.workspaceId);
    if (!canAccess) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const scope = resolveLegacyScope(data.scope, data.documentId ?? session.documentId);
    const resolvedDocumentId =
      scope === ChatScope.DOCUMENT ? data.documentId ?? session.documentId : undefined;
    if (scope !== session.scope) {
      return res.status(400).json({ ok: false, error: "Session scope mismatch" });
    }
    if (scope === ChatScope.DOCUMENT) {
      if (!resolvedDocumentId) {
        return res.status(400).json({ ok: false, error: "Document scope requires documentId" });
      }
      if (session.documentId !== resolvedDocumentId) {
        return res.status(400).json({ ok: false, error: "Document scope mismatch" });
      }
    }

    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "USER",
        content: data.content,
      },
    });

    const candidateFileIds = await resolveCandidateFileIds(session.id);

    const docs = await prisma.document.findMany({
      where: {
        workspaceId: session.workspaceId,
        id: { in: candidateFileIds.length > 0 ? candidateFileIds : ["__none__"] },
      },
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
        status: true,
      },
    });

    const keywords = Array.from(
      new Set(
        data.content
          .toLowerCase()
          .split(/\W+/)
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
      let page: number | undefined;

      if (pages.length > 0) {
        for (let i = 0; i < pages.length; i += 1) {
          for (const keyword of keywords) {
            snippet = buildSnippet(pages[i], keyword);
            if (snippet) {
              page = i + 1;
              break;
            }
          }
          if (snippet) break;
        }
      }

      if (!snippet) {
        for (const keyword of keywords) {
          snippet = buildSnippet(ocrText, keyword);
          if (snippet) break;
        }
      }

      if (snippet) {
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

    const notReadyCount = docs.filter((doc) => doc.status !== DocumentStatus.READY).length;

    let responseText =
      citations.length === 0
        ? "I couldn't find a matching passage in the current scope yet."
        : "I’ve pulled the most relevant passages in your current scope.";

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
              "Answer the user using only snippets. Return STRICT JSON with { answer, citations: [{ documentId, documentTitle, page, snippet, field }] }.",
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
        } catch {
          // ignore parsing issue
        }
      }
    }

    if (notReadyCount > 0) {
      responseText += " Some files are still indexing.";
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

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth.js";
import { ensureWorkspaceAccess, getAccessibleWorkspace } from "../lib/workspace.js";

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
      select: { id: true, role: true, content: true, createdAt: true },
    });

    res.json({ ok: true, messages });
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
      take: 5,
    });

    const lower = data.content.toLowerCase();
    let responseText = "Once you upload paperwork, I can answer with exact citations.";
    let citationDoc = docs[0];
    let citations: Array<{
      documentId: string;
      documentTitle: string;
      page?: number;
      snippet?: string;
      field?: string;
    }> = [];

    const findDoc = (keyword: string) =>
      docs.find((doc) => (doc.title ?? doc.fileName ?? "").toLowerCase().includes(keyword));

    if (docs.length === 0) {
      responseText = "Upload a letter or bill and I’ll cite the exact page for you.";
      citationDoc = undefined;
    } else if (lower.includes("council")) {
      citationDoc = findDoc("council") ?? docs[0];
      responseText =
        "Your council tax paperwork is on my radar. I’ve pulled the latest notice so we can confirm the due date.";
    } else if (lower.includes("energy")) {
      citationDoc = findDoc("energy") ?? docs[0];
      responseText =
        "Your recent energy bill looks ready to summarize. I can highlight the total due and billing period.";
    } else {
      responseText =
        "I can help with that. I’ll cite the exact letter and page once we confirm the right document.";
    }

    if (citationDoc) {
      citations = [
        {
          documentId: citationDoc.id,
          documentTitle: citationDoc.title ?? citationDoc.fileName ?? "Document",
          page: 1,
          snippet: "Sample evidence snippet will appear here once extraction is enabled.",
        },
      ];
    }

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "ASSISTANT",
        content: responseText,
      },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    // TODO: Persist citations once the data model supports it.

    res.status(201).json({ ok: true, message: assistantMessage, citations });
  })
);

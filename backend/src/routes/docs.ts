import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth.js";
import { ensureWorkspaceAccess, getAccessibleWorkspace } from "../lib/workspace.js";
import { enqueueCategorization } from "../jobs/categorizationQueue.js";

export const docsRouter = Router();

const createDocSchema = z.object({
  title: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().optional(),
});

const getQueryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

docsRouter.use(requireAuth);

docsRouter.post(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = createDocSchema.parse(req.body);
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const workspace = await getAccessibleWorkspace(
      userId,
      getQueryValue(req.query.workspaceId)
    );
    if (!workspace) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const doc = await prisma.document.create({
      data: {
        userId,
        workspaceId: workspace.id,
        title: data.title,
        fileName: data.fileName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        aiStatus: "PENDING",
      },
    });

    enqueueCategorization(doc.id);

    res.status(201).json({ ok: true, doc });
  })
);

docsRouter.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const workspace = await getAccessibleWorkspace(
      userId,
      getQueryValue(req.query.workspaceId)
    );
    if (!workspace) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const categoryId = getQueryValue(req.query.categoryId);
    const categoryName = getQueryValue(req.query.categoryName);

    const where = {
      workspaceId: workspace.id,
      ...(categoryId ? { categoryId } : {}),
      ...(categoryName
        ? { category: { name: { equals: categoryName, mode: "insensitive" } } }
        : {}),
    };

    const docs = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { category: { select: { id: true, name: true } } },
    });

    res.json({ ok: true, docs });
  })
);

docsRouter.get(
  "/count",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const workspace = await getAccessibleWorkspace(
      userId,
      getQueryValue(req.query.workspaceId)
    );
    if (!workspace) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const count = await prisma.document.count({
      where: { workspaceId: workspace.id },
    });

    res.json({ ok: true, count });
  })
);

docsRouter.get(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!doc) {
      return res.status(404).json({ ok: false, error: "Document not found" });
    }

    const canAccess = await ensureWorkspaceAccess(userId, doc.workspaceId);
    if (!canAccess) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    res.json({ ok: true, doc });
  })
);

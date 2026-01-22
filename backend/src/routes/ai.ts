import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth.js";
import { ensureWorkspaceAccess, getAccessibleWorkspace } from "../lib/workspace.js";
import { runCategorization } from "../services/categorizationService.js";

export const aiRouter = Router();

const categorizeSchema = z.object({
  documentId: z.string().min(1),
});

const pendingSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

aiRouter.use(requireAuth);

aiRouter.post(
  "/categorize-document",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const { documentId } = categorizeSchema.parse(req.body ?? {});
    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document) {
      return res.status(404).json({ ok: false, error: "Document not found" });
    }

    const canAccess = await ensureWorkspaceAccess(userId, document.workspaceId);
    if (!canAccess) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const result = await runCategorization(document.id);
    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.error });
    }

    res.json({ ok: true, document: result.document });
  })
);

aiRouter.post(
  "/categorize-pending",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const workspace = await getAccessibleWorkspace(userId);
    if (!workspace) {
      return res.status(404).json({ ok: false, error: "Workspace not found" });
    }

    const { limit } = pendingSchema.parse(req.body ?? {});
    const pendingDocs = await prisma.document.findMany({
      where: { workspaceId: workspace.id, aiStatus: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: limit ?? 10,
      select: { id: true },
    });

    const results = [] as Array<{ id: string; ok: boolean; error?: string }>;
    for (const doc of pendingDocs) {
      const result = await runCategorization(doc.id);
      results.push({ id: doc.id, ok: result.ok, error: result.ok ? undefined : result.error });
    }

    res.json({ ok: true, processed: results.length, results });
  })
);

import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth.js";
import { getAccessibleWorkspace } from "../lib/workspace.js";

export const workspacesRouter = Router();

workspacesRouter.use(requireAuth);

workspacesRouter.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const workspaces = await prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, type: true, createdAt: true },
    });

    res.json({ ok: true, workspaces });
  })
);

workspacesRouter.get(
  "/current",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const workspace = await getAccessibleWorkspace(userId);
    if (!workspace) {
      return res.status(404).json({ ok: false, error: "Workspace not found" });
    }

    res.json({
      ok: true,
      workspace: { id: workspace.id, name: workspace.name, type: workspace.type },
    });
  })
);

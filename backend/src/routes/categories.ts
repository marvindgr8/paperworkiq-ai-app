import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth.js";
import { getAccessibleWorkspace } from "../lib/workspace.js";

export const categoriesRouter = Router();

const getQueryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

categoriesRouter.use(requireAuth);

categoriesRouter.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const workspace = await getAccessibleWorkspace(userId, getQueryValue(req.query.workspaceId));
    if (!workspace) {
      return res.status(404).json({ ok: false, error: "Workspace not found" });
    }

    const categories = await prisma.category.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    res.json({ ok: true, categories });
  })
);

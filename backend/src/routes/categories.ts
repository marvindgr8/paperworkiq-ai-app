import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth.js";
import { ensureWorkspaceAccess, getAccessibleWorkspace } from "../lib/workspace.js";

export const categoriesRouter = Router();

const getQueryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const updateCategorySchema = z.object({
  name: z.string().min(1),
});

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

categoriesRouter.patch(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const data = updateCategorySchema.parse(req.body);
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
    });

    if (!category) {
      return res.status(404).json({ ok: false, error: "Category not found" });
    }

    const canAccess = await ensureWorkspaceAccess(userId, category.workspaceId);
    if (!canAccess) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const updatedCategory = await prisma.category.update({
      where: { id: category.id },
      data: { name: data.name },
      select: { id: true, name: true },
    });

    res.json({ ok: true, category: updatedCategory });
  })
);

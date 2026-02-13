import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth.js";
import { getAccessibleWorkspace } from "../lib/workspace.js";

export const foldersRouter = Router();

const createFolderSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().optional().nullable(),
});

const updateFolderSchema = z.object({
  name: z.string().min(1),
});

const moveFolderSchema = z.object({
  parentId: z.string().optional().nullable(),
});

const getQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const ensureFolderOwner = async (folderId: string, ownerId: string, workspaceId: string) => {
  const folder = await prisma.folder.findFirst({ where: { id: folderId, ownerId, workspaceId } });
  if (!folder) {
    return null;
  }
  return folder;
};

const isDescendant = async (folderId: string, possibleDescendantId: string) => {
  let currentId: string | null = possibleDescendantId;
  while (currentId) {
    if (currentId === folderId) {
      return true;
    }
    const current = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = current?.parentId ?? null;
  }
  return false;
};

foldersRouter.use(requireAuth);

foldersRouter.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const workspace = await getAccessibleWorkspace(userId, getQueryValue(req.query.workspaceId));
    if (!workspace) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const folders = await prisma.folder.findMany({
      where: { ownerId: userId, workspaceId: workspace.id },
      orderBy: [{ name: "asc" }],
    });

    res.json({ ok: true, folders });
  })
);

foldersRouter.post(
  "/create",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    const data = createFolderSchema.parse(req.body ?? {});

    const workspace = await getAccessibleWorkspace(userId, getQueryValue(req.query.workspaceId));
    if (!workspace) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    if (data.parentId) {
      const parent = await ensureFolderOwner(data.parentId, userId, workspace.id);
      if (!parent) {
        return res.status(404).json({ ok: false, error: "Parent folder not found" });
      }
    }

    const folder = await prisma.folder.create({
      data: { name: data.name, ownerId: userId, workspaceId: workspace.id, parentId: data.parentId ?? null },
    });

    res.status(201).json({ ok: true, folder });
  })
);

foldersRouter.patch(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    const data = updateFolderSchema.parse(req.body ?? {});
    const workspace = await getAccessibleWorkspace(userId, getQueryValue(req.query.workspaceId));
    if (!workspace) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }
    const folder = await ensureFolderOwner(req.params.id, userId, workspace.id);
    if (!folder) {
      return res.status(404).json({ ok: false, error: "Folder not found" });
    }

    const updated = await prisma.folder.update({
      where: { id: folder.id },
      data: { name: data.name },
    });

    res.json({ ok: true, folder: updated });
  })
);

foldersRouter.post(
  "/:id/move",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    const data = moveFolderSchema.parse(req.body ?? {});
    const workspace = await getAccessibleWorkspace(userId, getQueryValue(req.query.workspaceId));
    if (!workspace) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }
    const folder = await ensureFolderOwner(req.params.id, userId, workspace.id);
    if (!folder) {
      return res.status(404).json({ ok: false, error: "Folder not found" });
    }

    if (data.parentId) {
      const parent = await ensureFolderOwner(data.parentId, userId, workspace.id);
      if (!parent) {
        return res.status(404).json({ ok: false, error: "Parent folder not found" });
      }
      const moveIntoDescendant = await isDescendant(folder.id, parent.id);
      if (moveIntoDescendant) {
        return res.status(400).json({ ok: false, error: "Cannot move folder into descendant" });
      }
    }

    const moved = await prisma.folder.update({
      where: { id: folder.id },
      data: { parentId: data.parentId ?? null },
    });

    res.json({ ok: true, folder: moved });
  })
);

foldersRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const workspace = await getAccessibleWorkspace(userId, getQueryValue(req.query.workspaceId));
    if (!workspace) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const folder = await ensureFolderOwner(req.params.id, userId, workspace.id);
    if (!folder) {
      return res.status(404).json({ ok: false, error: "Folder not found" });
    }

    const [childCount, docCount] = await Promise.all([
      prisma.folder.count({ where: { parentId: folder.id } }),
      prisma.document.count({ where: { folderId: folder.id } }),
    ]);

    if (childCount > 0 || docCount > 0) {
      return res.status(400).json({ ok: false, error: "Folder is not empty" });
    }

    await prisma.folder.delete({ where: { id: folder.id } });

    res.json({ ok: true });
  })
);

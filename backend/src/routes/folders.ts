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

const shareFolderSchema = z.object({
  email: z.string().email(),
  permission: z.enum(["VIEW", "EDIT"]).default("VIEW"),
});

const getQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const ensureFolderAccess = async (folderId: string, userId: string, workspaceId: string) => {
  const folder = await prisma.folder.findFirst({
    where: {
      id: folderId,
      workspaceId,
      OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
    },
  });
  if (!folder) {
    return null;
  }
  return folder;
};

const canEditFolder = async (folderId: string, userId: string, workspaceId: string) => {
  const folder = await prisma.folder.findFirst({
    where: {
      id: folderId,
      workspaceId,
      OR: [{ ownerId: userId }, { shares: { some: { userId, permission: "EDIT" } } }],
    },
    select: { id: true },
  });
  return Boolean(folder);
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
      where: { workspaceId: workspace.id, OR: [{ ownerId: userId }, { shares: { some: { userId } } }] },
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
      const parent = await ensureFolderAccess(data.parentId, userId, workspace.id);
      if (!parent) {
        return res.status(404).json({ ok: false, error: "Parent folder not found" });
      }
      const canEditParent = await canEditFolder(parent.id, userId, workspace.id);
      if (!canEditParent) {
        return res.status(403).json({ ok: false, error: "Parent folder edit access denied" });
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
    const folder = await ensureFolderAccess(req.params.id, userId, workspace.id);
    if (!folder) {
      return res.status(404).json({ ok: false, error: "Folder not found" });
    }

    const canEdit = await canEditFolder(folder.id, userId, workspace.id);
    if (!canEdit) {
      return res.status(403).json({ ok: false, error: "Folder edit access denied" });
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
    const folder = await ensureFolderAccess(req.params.id, userId, workspace.id);
    if (!folder) {
      return res.status(404).json({ ok: false, error: "Folder not found" });
    }

    const canEdit = await canEditFolder(folder.id, userId, workspace.id);
    if (!canEdit) {
      return res.status(403).json({ ok: false, error: "Folder edit access denied" });
    }

    if (data.parentId) {
      const parent = await ensureFolderAccess(data.parentId, userId, workspace.id);
      if (!parent) {
        return res.status(404).json({ ok: false, error: "Parent folder not found" });
      }
      const canEditParent = await canEditFolder(parent.id, userId, workspace.id);
      if (!canEditParent) {
        return res.status(403).json({ ok: false, error: "Parent folder edit access denied" });
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

foldersRouter.post(
  "/:id/share",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const data = shareFolderSchema.parse(req.body ?? {});
    const workspace = await getAccessibleWorkspace(userId, getQueryValue(req.query.workspaceId));
    if (!workspace) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const folder = await prisma.folder.findFirst({ where: { id: req.params.id, workspaceId: workspace.id } });
    if (!folder) {
      return res.status(404).json({ ok: false, error: "Folder not found" });
    }

    if (folder.ownerId !== userId) {
      return res.status(403).json({ ok: false, error: "Only owner can share folder" });
    }

    const targetUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (!targetUser) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    await prisma.folderShare.upsert({
      where: { folderId_userId: { folderId: folder.id, userId: targetUser.id } },
      update: { permission: data.permission },
      create: { folderId: folder.id, userId: targetUser.id, permission: data.permission },
    });

    res.json({ ok: true });
  })
);

foldersRouter.delete(
  "/:id/share/:sharedUserId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const workspace = await getAccessibleWorkspace(userId, getQueryValue(req.query.workspaceId));
    if (!workspace) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const folder = await prisma.folder.findFirst({ where: { id: req.params.id, workspaceId: workspace.id } });
    if (!folder) {
      return res.status(404).json({ ok: false, error: "Folder not found" });
    }

    if (folder.ownerId !== userId) {
      return res.status(403).json({ ok: false, error: "Only owner can unshare folder" });
    }

    await prisma.folderShare.deleteMany({ where: { folderId: folder.id, userId: req.params.sharedUserId } });

    res.json({ ok: true });
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

    const folder = await ensureFolderAccess(req.params.id, userId, workspace.id);
    if (!folder) {
      return res.status(404).json({ ok: false, error: "Folder not found" });
    }

    const canEdit = await canEditFolder(folder.id, userId, workspace.id);
    if (!canEdit) {
      return res.status(403).json({ ok: false, error: "Folder edit access denied" });
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

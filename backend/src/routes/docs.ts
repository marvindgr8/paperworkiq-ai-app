import { Router } from "express";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth.js";
import { ensureWorkspaceAccess, getAccessibleWorkspace } from "../lib/workspace.js";
import {
  computeDocumentFileHash,
  enqueueDocumentProcessing,
} from "../services/documentProcessing.js";
import {
  deleteStoredFile,
  ensureUploadDir,
  getUploadDir,
  resolveStoragePath,
} from "../services/storageService.js";

export const docsRouter = Router();

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "application/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const isUploadMimeTypeAllowed = (mimeType: string) =>
  mimeType.startsWith("image/") || ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType);

const createDocSchema = z.object({
  title: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().optional(),
  folderId: z.string().optional().nullable(),
});

const getQueryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};


const moveDocumentSchema = z.object({
  folderId: z.string().optional().nullable(),
});

const renameDocumentSchema = z.object({
  name: z.string().min(1),
});


const shareDocumentSchema = z.object({
  email: z.string().email(),
  permission: z.enum(["VIEW", "EDIT"]).default("VIEW"),
});

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

const canEditDocument = async (documentId: string, userId: string) => {
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      OR: [
        { userId },
        { shares: { some: { userId, permission: "EDIT" } } },
        { folder: { shares: { some: { userId, permission: "EDIT" } } } },
      ],
    },
    select: { id: true },
  });

  return Boolean(doc);
};

await ensureUploadDir();


const normalizeRelativePath = (value: string | undefined, fallbackName: string) => {
  if (!value) {
    return fallbackName;
  }
  return value
    .replaceAll("\\", "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
};

const folderCacheKey = (workspaceId: string, parentId: string | null, folderName: string) =>
  `${workspaceId}:${parentId ?? "root"}:${folderName.toLowerCase()}`;

const findOrCreateFolder = async (
  userId: string,
  workspaceId: string,
  parentId: string | null,
  folderName: string,
  cache: Map<string, string>
) => {
  const cacheKey = folderCacheKey(workspaceId, parentId, folderName);
  const cached = cache.get(cacheKey);
  if (cached) {
    return { id: cached, created: false };
  }

  const existing = await prisma.folder.findFirst({
    where: { workspaceId, parentId, name: folderName },
    select: { id: true },
  });

  if (existing) {
    cache.set(cacheKey, existing.id);
    return { id: existing.id, created: false };
  }

  const created = await prisma.folder.create({
    data: { name: folderName, ownerId: userId, workspaceId, parentId },
    select: { id: true },
  });
  cache.set(cacheKey, created.id);
  return { id: created.id, created: true };
};


const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const uploadSingle = multer({ storage });
const uploadMany = multer({ storage });

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

    if (data.folderId) {
      const folder = await ensureFolderAccess(data.folderId, userId, workspace.id);
      if (!folder) {
        return res.status(404).json({ ok: false, error: "Folder not found" });
      }
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
        folderId: data.folderId ?? null,
      },
    });

    res.status(201).json({ ok: true, doc });
  })
);

docsRouter.post(
  "/upload",
  uploadSingle.single("file"),
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

    const folderId = typeof req.body.folderId === "string" ? req.body.folderId : undefined;

    if (folderId) {
      const folder = await ensureFolderAccess(folderId, userId, workspace.id);
      if (!folder) {
        return res.status(404).json({ ok: false, error: "Folder not found" });
      }
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ ok: false, error: "File is required" });
    }

    if (!isUploadMimeTypeAllowed(file.mimetype)) {
      await deleteStoredFile(file.filename);
      return res.status(400).json({ ok: false, error: "Unsupported file type" });
    }
    try {
      const fileHash = await computeDocumentFileHash(file.path);

      const doc = await prisma.document.create({
        data: {
          userId,
          workspaceId: workspace.id,
          title: file.originalname,
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storageKey: file.filename,
          fileHash,
          status: "PROCESSING",
          aiStatus: "PENDING",
          folderId: folderId ?? null,
        },
        include: { category: { select: { id: true, name: true } } },
      });

      enqueueDocumentProcessing(doc.id);

      res.status(201).json({ ok: true, doc });
    } catch (error) {
      await deleteStoredFile(file.filename);
      throw error;
    }
  })
);


docsRouter.post(
  "/upload-folder",
  uploadMany.array("files"),
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

    const parentFolderId = typeof req.body.parentFolderId === "string" && req.body.parentFolderId.length > 0
      ? req.body.parentFolderId
      : null;

    if (parentFolderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: parentFolderId, ownerId: userId, workspaceId: workspace.id },
      });
      if (!folder) {
        return res.status(404).json({ ok: false, error: "Parent folder not found" });
      }
    }

    const uploadedFiles = (req.files ?? []) as Express.Multer.File[];
    if (uploadedFiles.length === 0) {
      return res.status(400).json({ ok: false, error: "Files are required" });
    }

    const pathsRaw = typeof req.body.paths === "string" ? req.body.paths : "[]";
    let parsedJson: unknown = [];
    try {
      parsedJson = JSON.parse(pathsRaw);
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid paths payload" });
    }
    const parsedPaths = z.array(z.string()).safeParse(parsedJson);
    if (!parsedPaths.success) {
      return res.status(400).json({ ok: false, error: "Invalid paths payload" });
    }

    const paths = parsedPaths.data;
    if (paths.length !== uploadedFiles.length) {
      return res.status(400).json({ ok: false, error: "Paths count must match files count" });
    }

    const cache = new Map<string, string>();
    let createdFoldersCount = 0;
    const createdFiles: Array<{ id: string; name: string; folderId: string | null }> = [];
    let rootFolderCreatedId: string | null = null;

    try {
      for (let i = 0; i < uploadedFiles.length; i += 1) {
        const file = uploadedFiles[i];
        const relativePath = normalizeRelativePath(paths[i], file.originalname) || file.originalname;
        const segments = relativePath.split("/").filter(Boolean);
        const fileName = segments.at(-1) ?? file.originalname;
        const folderSegments = segments.slice(0, -1);

        let currentParentId = parentFolderId;
        for (const segment of folderSegments) {
          const folderResult = await findOrCreateFolder(
            userId,
            workspace.id,
            currentParentId,
            segment,
            cache
          );
          if (folderResult.created) {
            createdFoldersCount += 1;
            if (!rootFolderCreatedId && currentParentId === parentFolderId) {
              rootFolderCreatedId = folderResult.id;
            }
          }
          currentParentId = folderResult.id;
        }

        if (!isUploadMimeTypeAllowed(file.mimetype)) {
          continue;
        }

        const fileHash = await computeDocumentFileHash(file.path);
        const storageKey = `${workspace.id}/${currentParentId ?? "root"}/${crypto.randomUUID()}-${fileName}`;
        const destinationPath = resolveStoragePath(storageKey);
        await fs.mkdir(path.dirname(destinationPath), { recursive: true });
        await fs.rename(file.path, destinationPath);

        const doc = await prisma.document.create({
          data: {
            userId,
            workspaceId: workspace.id,
            title: fileName,
            fileName,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            storageKey,
            fileHash,
            status: "PROCESSING",
            aiStatus: "PENDING",
            folderId: currentParentId,
          },
          select: { id: true, fileName: true, folderId: true },
        });

        enqueueDocumentProcessing(doc.id);
        createdFiles.push({ id: doc.id, name: doc.fileName ?? fileName, folderId: doc.folderId });
      }
    } finally {
      await Promise.all(uploadedFiles.map(async (file) => {
        try {
          await fs.access(file.path);
          await fs.unlink(file.path);
        } catch {
          // noop: already moved/deleted
        }
      }));
    }

    res.status(201).json({
      ok: true,
      createdFoldersCount,
      createdFilesCount: createdFiles.length,
      rootFolderCreatedId,
      files: createdFiles,
    });
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
    const folderId = getQueryValue(req.query.folderId);

    const where = {
      workspaceId: workspace.id,
      OR: [
        { userId },
        { shares: { some: { userId } } },
        { folder: { shares: { some: { userId } } } },
      ],
      ...(categoryId ? { categoryId } : {}),
      ...(categoryName
        ? { category: { name: { equals: categoryName, mode: "insensitive" } } }
        : {}),
      ...(folderId === "root" ? { folderId: null } : folderId ? { folderId } : {}),
    };

    const docs = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        fileName: true,
        mimeType: true,
        status: true,
        aiStatus: true,
        createdAt: true,
        fileHash: true,
        categoryLabel: true,
        category: { select: { id: true, name: true } },
        folderId: true,
      },
    });

    res.json({ ok: true, docs });
  })
);

docsRouter.get(
  "/search",
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

    const query = getQueryValue(req.query.q)?.trim() ?? "";
    if (query.length < 2) {
      return res.json({ ok: true, docs: [] });
    }

    const limitValue = Number(getQueryValue(req.query.limit));
    const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 50) : 6;
    const textFilter = { contains: query, mode: "insensitive" as const };
    const orFilters = [
      { title: textFilter },
      { fileName: textFilter },
      { categoryLabel: textFilter },
      { category: { name: textFilter } },
      { ocrText: textFilter },
      { rawText: textFilter },
      { fields: { some: { valueText: textFilter } } },
    ];

    const numericValue = Number(query);
    if (!Number.isNaN(numericValue)) {
      orFilters.push({ fields: { some: { valueNumber: numericValue } } });
    }

    const parsedDate = new Date(query);
    if (!Number.isNaN(parsedDate.valueOf())) {
      orFilters.push({ fields: { some: { valueDate: parsedDate } } });
    }

    const docs = await prisma.document.findMany({
      where: {
        workspaceId: workspace.id,
        AND: [
          {
            OR: [
              { userId },
              { shares: { some: { userId } } },
              { folder: { shares: { some: { userId } } } },
            ],
          },
          { OR: orFilters },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        fileName: true,
        status: true,
        createdAt: true,
        categoryLabel: true,
        previewImageUrl: true,
        category: { select: { id: true, name: true } },
        folderId: true,
      },
    });

    res.json({
      ok: true,
      docs: docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName,
        status: doc.status,
        createdAt: doc.createdAt,
        categoryLabel: doc.categoryLabel,
        previewThumbUrl: doc.previewImageUrl,
        category: doc.category,
      })),
    });
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
      where: { workspaceId: workspace.id, OR: [{ userId }, { shares: { some: { userId } } }, { folder: { shares: { some: { userId } } } }] },
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
      include: {
        category: { select: { id: true, name: true } },
        folderId: true,
        fields: true,
      },
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

docsRouter.get(
  "/:id/file",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) {
      return res.status(404).json({ ok: false, error: "Document not found" });
    }

    const canAccess = await ensureWorkspaceAccess(userId, doc.workspaceId);
    if (!canAccess) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    if (!doc.storageKey) {
      return res.status(404).json({ ok: false, error: "Document file not found" });
    }

    const download = req.query.download === "1";
    if (doc.mimeType) {
      res.setHeader("Content-Type", doc.mimeType);
    }
    if (download) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${doc.fileName ?? "document"}"`
      );
    } else {
      res.setHeader("Content-Disposition", "inline");
    }
    const filePath = resolveStoragePath(doc.storageKey);
    res.sendFile(filePath);
  })
);

docsRouter.get(
  "/:id/preview",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) {
      return res.status(404).json({ ok: false, error: "Document not found" });
    }

    const canAccess = await ensureWorkspaceAccess(userId, doc.workspaceId);
    if (!canAccess) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    if (!doc.storageKey) {
      return res.status(404).json({ ok: false, error: "Document file not found" });
    }

    if (doc.mimeType) {
      res.setHeader("Content-Type", doc.mimeType);
    }
    res.setHeader("Content-Disposition", "inline");
    const filePath = resolveStoragePath(doc.storageKey);
    res.sendFile(filePath);
  })
);

docsRouter.post(
  "/:id/reprocess",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) {
      return res.status(404).json({ ok: false, error: "Document not found" });
    }

    const canAccess = await ensureWorkspaceAccess(userId, doc.workspaceId);
    if (!canAccess) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "PROCESSING", aiStatus: "PENDING", processingError: null },
    });

    enqueueDocumentProcessing(doc.id);

    res.json({ ok: true });
  })
);



docsRouter.post(
  "/:id/move",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const data = moveDocumentSchema.parse(req.body ?? {});

    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) {
      return res.status(404).json({ ok: false, error: "Document not found" });
    }

    const canAccess = await ensureWorkspaceAccess(userId, doc.workspaceId);
    if (!canAccess) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const canEdit = await canEditDocument(doc.id, userId);
    if (!canEdit) {
      return res.status(403).json({ ok: false, error: "Document edit access denied" });
    }

    if (data.folderId) {
      const folder = await ensureFolderAccess(data.folderId, userId, doc.workspaceId);
      if (!folder) {
        return res.status(404).json({ ok: false, error: "Folder not found" });
      }
    }

    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: { folderId: data.folderId ?? null },
      select: { id: true, folderId: true },
    });

    res.json({ ok: true, doc: updated });
  })
);

docsRouter.patch(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const data = renameDocumentSchema.parse(req.body ?? {});
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) {
      return res.status(404).json({ ok: false, error: "Document not found" });
    }

    const canAccess = await ensureWorkspaceAccess(userId, doc.workspaceId);
    if (!canAccess) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const canEdit = await canEditDocument(doc.id, userId);
    if (!canEdit) {
      return res.status(403).json({ ok: false, error: "Document edit access denied" });
    }

    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: { title: data.name, fileName: data.name },
      select: { id: true, title: true, fileName: true },
    });

    res.json({ ok: true, doc: updated });
  })
);

docsRouter.post(
  "/:id/share",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const data = shareDocumentSchema.parse(req.body ?? {});
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) {
      return res.status(404).json({ ok: false, error: "Document not found" });
    }

    if (doc.userId !== userId) {
      return res.status(403).json({ ok: false, error: "Only owner can share document" });
    }

    const targetUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (!targetUser) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    await prisma.documentShare.upsert({
      where: { documentId_userId: { documentId: doc.id, userId: targetUser.id } },
      update: { permission: data.permission },
      create: { documentId: doc.id, userId: targetUser.id, permission: data.permission },
    });

    return res.json({ ok: true });
  })
);

docsRouter.delete(
  "/:id/share/:sharedUserId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) {
      return res.status(404).json({ ok: false, error: "Document not found" });
    }

    if (doc.userId !== userId) {
      return res.status(403).json({ ok: false, error: "Only owner can unshare document" });
    }

    await prisma.documentShare.deleteMany({
      where: { documentId: doc.id, userId: req.params.sharedUserId },
    });

    return res.json({ ok: true });
  })
);

docsRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) {
      return res.status(404).json({ ok: false, error: "Document not found" });
    }

    const canAccess = await ensureWorkspaceAccess(userId, doc.workspaceId);
    if (!canAccess) {
      return res.status(403).json({ ok: false, error: "Workspace access denied" });
    }

    const canEdit = await canEditDocument(doc.id, userId);
    if (!canEdit) {
      return res.status(403).json({ ok: false, error: "Document edit access denied" });
    }

    await prisma.extractedField.deleteMany({ where: { documentId: doc.id } });
    await prisma.document.delete({ where: { id: doc.id } });
    await deleteStoredFile(doc.storageKey);

    res.json({ ok: true });
  })
);

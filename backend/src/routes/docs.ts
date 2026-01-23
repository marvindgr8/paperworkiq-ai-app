import { Router } from "express";
import path from "node:path";
import crypto from "node:crypto";
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

await ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({ storage });

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

    res.status(201).json({ ok: true, doc });
  })
);

docsRouter.post(
  "/upload",
  upload.single("file"),
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

    const file = req.file;
    if (!file) {
      return res.status(400).json({ ok: false, error: "File is required" });
    }

    const isImage = file.mimetype.startsWith("image/");
    const isPdf = file.mimetype === "application/pdf";

    if (!isImage && !isPdf) {
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
        OR: orFilters,
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
      include: {
        category: { select: { id: true, name: true } },
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

    await prisma.extractedField.deleteMany({ where: { documentId: doc.id } });
    await prisma.document.delete({ where: { id: doc.id } });
    await deleteStoredFile(doc.storageKey);

    res.json({ ok: true });
  })
);

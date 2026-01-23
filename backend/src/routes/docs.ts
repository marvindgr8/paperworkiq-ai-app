import { Router } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth.js";
import { ensureWorkspaceAccess, getAccessibleWorkspace } from "../lib/workspace.js";
import { detectSensitiveContent, extractTextFromImage, extractTextFromPdf } from "../services/ocrService.js";
import { enqueueExtraction } from "../services/extractionService.js";

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

const uploadDir = path.join(process.cwd(), "uploads");

await fs.mkdir(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
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
      await fs.unlink(file.path);
      return res.status(400).json({ ok: false, error: "Unsupported file type" });
    }

    let ocrText = "";
    let ocrPages: string[] | null = null;
    try {
      if (isImage) {
        ocrText = await extractTextFromImage(file.path);
      } else {
        const pdfText = await extractTextFromPdf(file.path);
        ocrText = pdfText.text;
        ocrPages = pdfText.pages;
      }
    } catch (error) {
      await fs.unlink(file.path);
      throw error;
    }

    const sensitiveMatch = detectSensitiveContent(ocrText);
    if (sensitiveMatch.matched) {
      await fs.unlink(file.path);
      return res.status(400).json({
        ok: false,
        error:
          "Sensitive documents (passwords, security codes, or account secrets) are not allowed.",
        reason: sensitiveMatch.reason,
      });
    }

    const fileUrl = `/uploads/${file.filename}`;
    const previewImageUrl = isImage ? fileUrl : null;

    const doc = await prisma.document.create({
      data: {
        userId,
        workspaceId: workspace.id,
        title: file.originalname,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: file.filename,
        fileUrl,
        previewImageUrl,
        ocrText,
        ocrPages,
        status: "PROCESSING",
        aiStatus: "PENDING",
      },
      include: { category: { select: { id: true, name: true } } },
    });

    enqueueExtraction(doc.id);

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
      select: {
        id: true,
        title: true,
        fileName: true,
        mimeType: true,
        status: true,
        aiStatus: true,
        createdAt: true,
        previewImageUrl: true,
        fileUrl: true,
        category: { select: { id: true, name: true } },
      },
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

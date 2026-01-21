import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth.js";

export const docsRouter = Router();

const createDocSchema = z.object({
  title: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().optional(),
});

docsRouter.use(requireAuth);

docsRouter.post(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = createDocSchema.parse(req.body);
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const doc = await prisma.document.create({
      data: {
        userId,
        title: data.title,
        fileName: data.fileName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
      },
    });

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

    const docs = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ ok: true, docs });
  })
);

docsRouter.get(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!doc) {
      return res.status(404).json({ ok: false, error: "Document not found" });
    }

    res.json({ ok: true, doc });
  })
);

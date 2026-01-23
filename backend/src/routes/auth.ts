import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { hashPassword, signToken, verifyPassword } from "../lib/auth.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth.js";

export const authRouter = Router();

const toPersonalWorkspaceName = (name?: string | null) => {
  const trimmed = name?.trim();
  if (!trimmed) {
    return "Personal";
  }
  const firstName = trimmed.split(/\s+/)[0];
  return `${firstName}'s Paperwork`;
};

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ ok: false, error: "Email already registered" });
    }

    const passwordHash = await hashPassword(data.password);
    const { user, workspace } = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
        },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      const createdWorkspace = await tx.workspace.create({
        data: {
          name: toPersonalWorkspaceName(createdUser.name),
          type: "PERSONAL",
          ownerId: createdUser.id,
        },
        select: { id: true, name: true, type: true, createdAt: true },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: createdWorkspace.id,
          userId: createdUser.id,
          role: "OWNER",
        },
      });

      return { user: createdUser, workspace: createdWorkspace };
    });

    const token = signToken(user.id);
    res.status(201).json({ ok: true, user, workspace, token });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const token = signToken(user.id);
    res.json({ ok: true, token });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    res.json({ ok: true, user });
  })
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    res.json({ ok: true });
  })
);

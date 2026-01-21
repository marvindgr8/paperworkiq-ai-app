import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Missing token" });
  }

  try {
    const token = header.replace("Bearer ", "");
    const payload = verifyToken(token);
    req.userId = payload.userId;
    return next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
};

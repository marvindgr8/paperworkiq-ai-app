import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "./env.js";

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string) => bcrypt.hash(password, SALT_ROUNDS);

export const verifyPassword = async (password: string, hash: string) =>
  bcrypt.compare(password, hash);

export const signToken = (userId: string) =>
  jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: "7d" });

export const verifyToken = (token: string) =>
  jwt.verify(token, env.JWT_SECRET) as { userId: string };

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BACKEND_PORT: z.coerce.number().default(4000),
  FRONTEND_PORT: z.coerce.number().default(5173),
  JWT_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  BACKEND_PORT: process.env.BACKEND_PORT,
  FRONTEND_PORT: process.env.FRONTEND_PORT,
  JWT_SECRET: process.env.JWT_SECRET,
});

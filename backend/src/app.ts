import express from "express";
import cors from "cors";
import morgan from "morgan";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { docsRouter } from "./routes/docs.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { env } from "./lib/env.js";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: [`http://localhost:${env.FRONTEND_PORT}`],
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.use("/api", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/docs", docsRouter);

  app.use(errorHandler);

  return app;
};

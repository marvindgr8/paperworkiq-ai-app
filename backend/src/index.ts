import "dotenv/config";
import { createApp } from "./app.js";
import { env } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();

const start = async () => {
  try {
    await prisma.$connect();
    app.listen(env.BACKEND_PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend listening on http://localhost:${env.BACKEND_PORT}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

void start();

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

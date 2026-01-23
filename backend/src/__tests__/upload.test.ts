import request from "supertest";
import { describe, it, expect, afterAll, vi } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

vi.mock("../services/documentProcessing.js", () => ({
  enqueueDocumentProcessing: vi.fn(),
  computeDocumentFileHash: vi.fn().mockResolvedValue("hash-123"),
}));

const app = createApp();

const cleanupUser = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return;
  }

  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: user.id },
    select: { id: true },
  });
  const workspaceIds = workspaces.map((workspace) => workspace.id);

  await prisma.chatCitation.deleteMany({
    where: { message: { is: { session: { is: { userId: user.id } } } } },
  });
  await prisma.chatMessage.deleteMany({ where: { session: { is: { userId: user.id } } } });
  await prisma.chatSession.deleteMany({ where: { userId: user.id } });
  await prisma.extractedField.deleteMany({ where: { document: { is: { userId: user.id } } } });
  await prisma.document.deleteMany({ where: { userId: user.id } });
  if (workspaceIds.length > 0) {
    await prisma.workspaceMember.deleteMany({
      where: { OR: [{ userId: user.id }, { workspaceId: { in: workspaceIds } }] },
    });
    await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
  }
  await prisma.workspaceMember.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
};

describe("document uploads", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("uploads an image and creates a document", async () => {
    const email = `upload-${Date.now()}@example.com`;

    const registerResponse = await request(app).post("/api/auth/register").send({
      email,
      password: "password123",
      name: "Dana Upload",
    });

    expect(registerResponse.status).toBe(201);

    const token = registerResponse.body.token as string;

    const uploadResponse = await request(app)
      .post("/api/documents/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("fake"), {
        filename: "invoice.png",
        contentType: "image/png",
      });

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body.doc.fileHash).toBe("hash-123");
    expect(uploadResponse.body.doc.status).toBe("PROCESSING");

    await cleanupUser(email);
  });
});

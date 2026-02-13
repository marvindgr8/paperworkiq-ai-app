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


  it("uploads a csv file", async () => {
    const email = `upload-csv-${Date.now()}@example.com`;

    const registerResponse = await request(app).post("/api/auth/register").send({
      email,
      password: "password123",
      name: "Dana CSV Upload",
    });

    expect(registerResponse.status).toBe(201);

    const token = registerResponse.body.token as string;

    const uploadResponse = await request(app)
      .post("/api/documents/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("a,b\n1,2"), {
        filename: "data.csv",
        contentType: "text/csv",
      });

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body.doc.fileName).toBe("data.csv");

    await cleanupUser(email);
  });

  it("uploads a folder and recreates nested folders", async () => {
    const email = `upload-folder-${Date.now()}@example.com`;

    const registerResponse = await request(app).post("/api/auth/register").send({
      email,
      password: "password123",
      name: "Dana Folder Upload",
    });

    expect(registerResponse.status).toBe(201);

    const token = registerResponse.body.token as string;

    const uploadResponse = await request(app)
      .post("/api/files/upload-folder")
      .set("Authorization", `Bearer ${token}`)
      .field("paths", JSON.stringify(["Invoices/2026/january.png", "Invoices/2026/february.png"]))
      .attach("files", Buffer.from("fake-a"), {
        filename: "january.png",
        contentType: "image/png",
      })
      .attach("files", Buffer.from("fake-b"), {
        filename: "february.png",
        contentType: "image/png",
      });

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body.createdFoldersCount).toBeGreaterThanOrEqual(2);
    expect(uploadResponse.body.createdFilesCount).toBe(2);

    await cleanupUser(email);
  });
});

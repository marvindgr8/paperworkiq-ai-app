import request from "supertest";
import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { categorizeDocumentWithOpenAI } from "../services/openaiCategorizer.js";

vi.mock("../services/openaiCategorizer.js", () => ({
  categorizeDocumentWithOpenAI: vi.fn(),
}));

const app = createApp();
const mockedCategorizer = vi.mocked(categorizeDocumentWithOpenAI);

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
    await prisma.category.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await prisma.workspaceMember.deleteMany({
      where: { OR: [{ userId: user.id }, { workspaceId: { in: workspaceIds } }] },
    });
    await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
  }
  await prisma.workspaceMember.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
};

describe("categorization endpoints", () => {
  beforeEach(() => {
    mockedCategorizer.mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores the category label on the document", async () => {
    const email = `ai-${Date.now()}@example.com`;

    const registerResponse = await request(app).post("/api/auth/register").send({
      email,
      password: "password123",
      name: "Taylor Lane",
    });

    const token = registerResponse.body.token as string;
    const workspaceId = registerResponse.body.workspace.id as string;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error("User not created");
    }

    const document = await prisma.document.create({
      data: {
        userId: user.id,
        workspaceId,
        title: "Power bill",
      },
    });

    mockedCategorizer.mockResolvedValueOnce({
      categoryName: "Energy",
      confidence: 0.88,
      rationale: "Utility bill",
      reuseExisting: false,
      rawResponse: JSON.stringify({ categoryName: "Energy" }),
      model: "gpt-4.1-mini",
    });

    const response = await request(app)
      .post("/api/ai/categorize-document")
      .set("Authorization", `Bearer ${token}`)
      .send({ documentId: document.id });

    expect(response.status).toBe(200);

    const updatedDocument = await prisma.document.findUnique({
      where: { id: document.id },
      include: { category: true },
    });

    expect(updatedDocument?.aiStatus).toBe("READY");
    expect(updatedDocument?.categoryLabel).toBe("Energy");
    expect(updatedDocument?.aiConfidence).toBeCloseTo(0.88, 2);

    const categories = await prisma.category.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    expect(categories).toHaveLength(0);

    await cleanupUser(email);
  });

  it("reuses an existing category when available", async () => {
    const email = `ai-${Date.now()}@example.com`;

    const registerResponse = await request(app).post("/api/auth/register").send({
      email,
      password: "password123",
      name: "Jordan Reed",
    });

    const token = registerResponse.body.token as string;
    const workspaceId = registerResponse.body.workspace.id as string;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error("User not created");
    }

    const existingCategory = await prisma.category.create({
      data: { workspaceId, name: "Banking" },
    });

    const document = await prisma.document.create({
      data: {
        userId: user.id,
        workspaceId,
        title: "Statement",
      },
    });

    mockedCategorizer.mockResolvedValueOnce({
      categoryName: "banking",
      confidence: 0.7,
      rationale: "Statement",
      reuseExisting: true,
      rawResponse: JSON.stringify({ categoryName: "banking" }),
      model: "gpt-4.1-mini",
    });

    const response = await request(app)
      .post("/api/ai/categorize-document")
      .set("Authorization", `Bearer ${token}`)
      .send({ documentId: document.id });

    expect(response.status).toBe(200);

    const updatedDocument = await prisma.document.findUnique({
      where: { id: document.id },
      include: { category: true },
    });

    expect(updatedDocument?.categoryId).toBe(existingCategory.id);
    expect(updatedDocument?.category?.name).toBe("Banking");

    const categories = await prisma.category.findMany({
      where: { workspaceId },
    });
    expect(categories).toHaveLength(1);

    await cleanupUser(email);
  });
});

import { describe, it, expect, afterAll, vi } from "vitest";
import { prisma } from "../lib/prisma.js";

vi.mock("../services/categorizationService.js", () => ({
  runCategorization: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          model: "gpt-4.1-mini",
          choices: [
            {
              message: {
                content:
                  '{"documentType":"Invoice","summary":"Invoice summary","extractedFields":[{"label":"Total","value":"120","confidence":0.9,"source":"Total due 120"}],"importantDates":[],"amounts":[{"label":"Total","value":120,"currency":"USD"}]}',
              },
            },
          ],
        }),
      },
    };
  },
}));

describe("runExtraction", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores extracted fields and updates the document", async () => {
    process.env.OPENAI_API_KEY = "test";
    const { runExtraction } = await import("../services/extractionService.js");

    const user = await prisma.user.create({
      data: {
        email: `extract-${Date.now()}@example.com`,
        passwordHash: "hash",
      },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: "Personal",
        type: "PERSONAL",
        ownerId: user.id,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    const document = await prisma.document.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        title: "Invoice",
        ocrText: "Total due 120",
      },
    });

    const result = await runExtraction(document.id);

    expect(result.ok).toBe(true);

    const updatedDoc = await prisma.document.findUnique({ where: { id: document.id } });
    expect(updatedDoc?.status).toBe("READY");
    expect(updatedDoc?.extractData).toBeTruthy();

    const fields = await prisma.extractedField.findMany({
      where: { documentId: document.id },
    });

    expect(fields.length).toBeGreaterThan(0);

    await prisma.extractedField.deleteMany({ where: { documentId: document.id } });
    await prisma.document.delete({ where: { id: document.id } });
    await prisma.workspaceMember.deleteMany({ where: { userId: user.id } });
    await prisma.workspace.delete({ where: { id: workspace.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});

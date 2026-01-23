import { describe, it, expect, vi } from "vitest";

const processDocument = vi.fn().mockResolvedValue({ ok: true });

vi.mock("../services/documentProcessing.js", () => ({
  processDocument,
  enqueueDocumentProcessing: vi.fn(),
}));

describe("runExtraction", () => {
  it("delegates to document processing", async () => {
    const { runExtraction } = await import("../services/extractionService.js");
    const result = await runExtraction("doc-123");

    expect(processDocument).toHaveBeenCalledWith("doc-123");
    expect(result.ok).toBe(true);
  });
});

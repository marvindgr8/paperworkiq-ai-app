import { describe, it, expect } from "vitest";
import { detectSensitiveDocument } from "../services/ocrService.js";

describe("detectSensitiveDocument", () => {
  it("flags passwords", () => {
    const result = detectSensitiveDocument({ text: "Password: hunter2" });
    expect(result.matched).toBe(true);
  });

  it("allows non-sensitive text", () => {
    const result = detectSensitiveDocument({ text: "Invoice total is $120" });
    expect(result.matched).toBe(false);
  });
});

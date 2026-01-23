import { describe, it, expect } from "vitest";
import { detectSensitiveContent } from "../services/ocrService.js";

describe("detectSensitiveContent", () => {
  it("flags passwords", () => {
    const result = detectSensitiveContent("Password: hunter2");
    expect(result.matched).toBe(true);
  });

  it("allows non-sensitive text", () => {
    const result = detectSensitiveContent("Invoice total is $120");
    expect(result.matched).toBe(false);
  });
});

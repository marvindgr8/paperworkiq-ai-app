import request from "supertest";
import { describe, it, expect } from "vitest";
import { createApp } from "../app.js";

const app = createApp();

describe("health endpoints", () => {
  it("GET /api/health returns ok true", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("GET /api/docs returns 401 without auth", async () => {
    const response = await request(app).get("/api/docs");
    expect(response.status).toBe(401);
  });
});

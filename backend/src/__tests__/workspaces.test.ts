import request from "supertest";
import { describe, it, expect, afterAll } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

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

  await prisma.chatMessage.deleteMany({ where: { session: { is: { userId: user.id } } } });
  await prisma.chatSession.deleteMany({ where: { userId: user.id } });
  await prisma.extractedField.deleteMany({ where: { document: { is: { userId: user.id } } } });
  await prisma.document.deleteMany({ where: { userId: user.id } });
  if (workspaceIds.length > 0) {
    await prisma.category.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  }
  if (workspaceIds.length > 0) {
    await prisma.workspaceMember.deleteMany({
      where: { OR: [{ userId: user.id }, { workspaceId: { in: workspaceIds } }] },
    });
    await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
  }
  await prisma.workspaceMember.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
};

describe("workspace-aware onboarding", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("register creates a personal workspace and membership", async () => {
    const email = `personal-${Date.now()}@example.com`;

    const registerResponse = await request(app).post("/api/auth/register").send({
      email,
      password: "password123",
      name: "Jamie Lee",
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.workspace?.type).toBe("PERSONAL");

    const token = registerResponse.body.token as string;
    const workspacesResponse = await request(app)
      .get("/api/workspaces")
      .set("Authorization", `Bearer ${token}`);

    expect(workspacesResponse.status).toBe(200);
    expect(workspacesResponse.body.workspaces).toHaveLength(1);
    expect(workspacesResponse.body.workspaces[0].type).toBe("PERSONAL");

    const workspaceId = workspacesResponse.body.workspaces[0].id as string;
    const categories = await prisma.category.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    expect(categories).toHaveLength(0);

    await cleanupUser(email);
  });

  it("scopes documents to the active workspace", async () => {
    const email = `docs-${Date.now()}@example.com`;

    const registerResponse = await request(app).post("/api/auth/register").send({
      email,
      password: "password123",
      name: "Riley Quinn",
    });

    expect(registerResponse.status).toBe(201);

    const token = registerResponse.body.token as string;
    const currentWorkspaceResponse = await request(app)
      .get("/api/workspaces/current")
      .set("Authorization", `Bearer ${token}`);

    expect(currentWorkspaceResponse.status).toBe(200);
    const defaultWorkspaceId = currentWorkspaceResponse.body.workspace.id as string;

    await request(app)
      .post("/api/docs")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Personal document" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error("User not created");
    }

    const teamWorkspace = await prisma.workspace.create({
      data: {
        name: "Shared household",
        type: "TEAM",
        ownerId: user.id,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: teamWorkspace.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    await request(app)
      .post(`/api/docs?workspaceId=${teamWorkspace.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Shared bill" });

    const defaultDocsResponse = await request(app)
      .get("/api/docs")
      .set("Authorization", `Bearer ${token}`);

    expect(defaultDocsResponse.status).toBe(200);
    expect(defaultDocsResponse.body.docs).toHaveLength(1);
    expect(defaultDocsResponse.body.docs[0].workspaceId).toBe(defaultWorkspaceId);

    const teamDocsResponse = await request(app)
      .get(`/api/docs?workspaceId=${teamWorkspace.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(teamDocsResponse.status).toBe(200);
    expect(teamDocsResponse.body.docs).toHaveLength(1);
    expect(teamDocsResponse.body.docs[0].workspaceId).toBe(teamWorkspace.id);

    await cleanupUser(email);
  });
});

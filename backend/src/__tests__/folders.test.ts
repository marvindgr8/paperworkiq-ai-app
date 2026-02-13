import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();

const registerUser = async (email: string) => {
  const response = await request(app).post("/api/auth/register").send({
    email,
    password: "password123",
    name: "Folder User",
  });
  expect(response.status).toBe(201);
  return response.body.token as string;
};

const cleanupUser = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  await prisma.chatCitation.deleteMany({ where: { document: { is: { userId: user.id } } } });
  await prisma.extractedField.deleteMany({ where: { document: { is: { userId: user.id } } } });
  await prisma.document.deleteMany({ where: { userId: user.id } });
  await prisma.folder.deleteMany({ where: { ownerId: user.id } });
  await prisma.workspaceMember.deleteMany({ where: { userId: user.id } });
  await prisma.workspace.deleteMany({ where: { ownerId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
};

describe("folders routes", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates and renames folders", async () => {
    const email = `folders-${Date.now()}@example.com`;
    const token = await registerUser(email);

    const create = await request(app)
      .post("/api/folders/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bills" });

    expect(create.status).toBe(201);
    expect(create.body.folder.name).toBe("Bills");

    const rename = await request(app)
      .patch(`/api/folders/${create.body.folder.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Paid Bills" });

    expect(rename.status).toBe(200);
    expect(rename.body.folder.name).toBe("Paid Bills");

    await cleanupUser(email);
  });

  it("blocks moving folder into descendant", async () => {
    const email = `folders-move-${Date.now()}@example.com`;
    const token = await registerUser(email);

    const parent = await request(app)
      .post("/api/folders/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Parent" });
    const child = await request(app)
      .post("/api/folders/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Child", parentId: parent.body.folder.id });

    const badMove = await request(app)
      .post(`/api/folders/${parent.body.folder.id}/move`)
      .set("Authorization", `Bearer ${token}`)
      .send({ parentId: child.body.folder.id });

    expect(badMove.status).toBe(400);

    await cleanupUser(email);
  });

  it("moves documents into and out of folders", async () => {
    const email = `folders-doc-${Date.now()}@example.com`;
    const token = await registerUser(email);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const workspace = await prisma.workspace.findFirstOrThrow({ where: { ownerId: user.id } });
    const folder = await prisma.folder.create({
      data: { name: "Inbox", ownerId: user.id, workspaceId: workspace.id },
    });
    const doc = await prisma.document.create({
      data: { userId: user.id, workspaceId: workspace.id, title: "Doc" },
    });

    const moveIn = await request(app)
      .post(`/api/docs/${doc.id}/move`)
      .set("Authorization", `Bearer ${token}`)
      .send({ folderId: folder.id });
    expect(moveIn.status).toBe(200);
    expect(moveIn.body.doc.folderId).toBe(folder.id);

    const moveOut = await request(app)
      .post(`/api/docs/${doc.id}/move`)
      .set("Authorization", `Bearer ${token}`)
      .send({ folderId: null });
    expect(moveOut.status).toBe(200);
    expect(moveOut.body.doc.folderId).toBeNull();

    await cleanupUser(email);
  });
});

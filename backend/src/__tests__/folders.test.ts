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

  it("allows sharing folders and documents with view/edit permissions", async () => {
    const ownerEmail = `folders-share-owner-${Date.now()}@example.com`;
    const viewerEmail = `folders-share-viewer-${Date.now()}@example.com`;
    const ownerToken = await registerUser(ownerEmail);
    const viewerToken = await registerUser(viewerEmail);

    const owner = await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } });
    const ownerWorkspace = await prisma.workspace.findFirstOrThrow({ where: { ownerId: owner.id } });
    const viewer = await prisma.user.findUniqueOrThrow({ where: { email: viewerEmail } });

    await prisma.workspaceMember.create({
      data: { workspaceId: ownerWorkspace.id, userId: viewer.id, role: "MEMBER" },
    });

    const folder = await prisma.folder.create({
      data: { name: "Shared Folder", ownerId: owner.id, workspaceId: ownerWorkspace.id },
    });
    const doc = await prisma.document.create({
      data: { userId: owner.id, workspaceId: ownerWorkspace.id, folderId: folder.id, title: "Shared Doc" },
    });

    const shareFolderView = await request(app)
      .post(`/api/folders/${folder.id}/share`)
      .query({ workspaceId: ownerWorkspace.id })
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: viewerEmail, permission: "VIEW" });
    expect(shareFolderView.status).toBe(200);

    const shareDocEdit = await request(app)
      .post(`/api/docs/${doc.id}/share`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: viewerEmail, permission: "EDIT" });
    expect(shareDocEdit.status).toBe(200);

    const listFolders = await request(app)
      .get("/api/folders")
      .query({ workspaceId: ownerWorkspace.id })
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(listFolders.status).toBe(200);
    expect(listFolders.body.folders.some((item: { id: string }) => item.id === folder.id)).toBe(true);

    const listDocs = await request(app)
      .get("/api/docs")
      .query({ workspaceId: ownerWorkspace.id, folderId: folder.id })
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(listDocs.status).toBe(200);
    expect(listDocs.body.docs.some((item: { id: string }) => item.id === doc.id)).toBe(true);

    const renameFolderDenied = await request(app)
      .patch(`/api/folders/${folder.id}`)
      .query({ workspaceId: ownerWorkspace.id })
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ name: "Should fail" });
    expect(renameFolderDenied.status).toBe(403);

    const shareFolderEdit = await request(app)
      .post(`/api/folders/${folder.id}/share`)
      .query({ workspaceId: ownerWorkspace.id })
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: viewerEmail, permission: "EDIT" });
    expect(shareFolderEdit.status).toBe(200);

    const renameFolderAllowed = await request(app)
      .patch(`/api/folders/${folder.id}`)
      .query({ workspaceId: ownerWorkspace.id })
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ name: "Viewer renamed" });
    expect(renameFolderAllowed.status).toBe(200);

    const renameDocAllowed = await request(app)
      .patch(`/api/docs/${doc.id}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ name: "Viewer doc rename" });
    expect(renameDocAllowed.status).toBe(200);

    await cleanupUser(ownerEmail);
    await cleanupUser(viewerEmail);
  });

});

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

describe("chat sessions", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  const registerUser = async (email: string) => {
    const registerResponse = await request(app).post("/api/auth/register").send({
      email,
      password: "password123",
      name: "Jordan Lane",
    });

    expect(registerResponse.status).toBe(201);

    const token = registerResponse.body.token as string;
    const currentWorkspace = await request(app)
      .get("/api/workspaces/current")
      .set("Authorization", `Bearer ${token}`);

    expect(currentWorkspace.status).toBe(200);

    return { token, workspaceId: currentWorkspace.body.workspace.id as string };
  };

  it("requires auth", async () => {
    const response = await request(app).get("/api/chat/sessions");
    expect(response.status).toBe(401);
  });

  it("creates workspace sessions with null documentId", async () => {
    const email = `chat-${Date.now()}@example.com`;
    const { token, workspaceId } = await registerUser(email);

    const createSessionResponse = await request(app)
      .post("/api/chat/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ scope: "WORKSPACE" });

    expect(createSessionResponse.status).toBe(201);
    expect(createSessionResponse.body.session.id).toBeDefined();

    const sessionId = createSessionResponse.body.session.id as string;
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });

    expect(session?.workspaceId).toBe(workspaceId);
    expect(session?.scope).toBe("WORKSPACE");
    expect(session?.documentId).toBeNull();

    await cleanupUser(email);
  });

  it("requires documentId when creating document sessions", async () => {
    const email = `doc-scope-${Date.now()}@example.com`;
    const { token, workspaceId } = await registerUser(email);

    const document = await prisma.document.create({
      data: {
        userId: (await prisma.user.findUnique({ where: { email } }))!.id,
        workspaceId,
        title: "Lease",
      },
      select: { id: true },
    });

    const createSessionResponse = await request(app)
      .post("/api/chat/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ scope: "DOCUMENT", documentId: document.id });

    expect(createSessionResponse.status).toBe(201);
    const sessionId = createSessionResponse.body.session.id as string;
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });

    expect(session?.scope).toBe("DOCUMENT");
    expect(session?.documentId).toBe(document.id);

    const missingDocResponse = await request(app)
      .post("/api/chat/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ scope: "DOCUMENT" });

    expect(missingDocResponse.status).toBe(400);

    await cleanupUser(email);
  });

  it("creates user and assistant messages", async () => {
    const email = `messages-${Date.now()}@example.com`;
    const { token } = await registerUser(email);
    const sessionResponse = await request(app)
      .post("/api/chat/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ scope: "WORKSPACE" });

    expect(sessionResponse.status).toBe(201);
    const sessionId = sessionResponse.body.session.id as string;

    const messageResponse = await request(app)
      .post(`/api/chat/sessions/${sessionId}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Summarise my energy bill", scope: "WORKSPACE" });

    expect(messageResponse.status).toBe(201);
    expect(messageResponse.body.message.role).toBe("ASSISTANT");

    const messagesResponse = await request(app)
      .get(`/api/chat/sessions/${sessionId}/messages?scope=WORKSPACE`)
      .set("Authorization", `Bearer ${token}`);

    expect(messagesResponse.status).toBe(200);
    expect(messagesResponse.body.messages).toHaveLength(2);

    await cleanupUser(email);
  });

  it("blocks posting document-scoped messages to workspace sessions", async () => {
    const email = `scope-mismatch-${Date.now()}@example.com`;
    const { token, workspaceId } = await registerUser(email);
    const user = await prisma.user.findUnique({ where: { email } });

    const document = await prisma.document.create({
      data: {
        userId: user!.id,
        workspaceId,
        title: "Policy",
      },
      select: { id: true },
    });

    const sessionResponse = await request(app)
      .post("/api/chat/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ scope: "WORKSPACE" });

    expect(sessionResponse.status).toBe(201);
    const sessionId = sessionResponse.body.session.id as string;

    const messageResponse = await request(app)
      .post(`/api/chat/sessions/${sessionId}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Use this doc", scope: "DOCUMENT", documentId: document.id });

    expect(messageResponse.status).toBe(400);

    await cleanupUser(email);
  });

  it("scopes reads to workspace sessions only", async () => {
    const email = `scope-read-workspace-${Date.now()}@example.com`;
    const { token, workspaceId } = await registerUser(email);
    const user = await prisma.user.findUnique({ where: { email } });

    const document = await prisma.document.create({
      data: {
        userId: user!.id,
        workspaceId,
        title: "Invoice",
      },
      select: { id: true },
    });

    const workspaceSession = await prisma.chatSession.create({
      data: {
        userId: user!.id,
        workspaceId,
        scope: "WORKSPACE",
      },
      select: { id: true },
    });

    const documentSession = await prisma.chatSession.create({
      data: {
        userId: user!.id,
        workspaceId,
        scope: "DOCUMENT",
        documentId: document.id,
      },
      select: { id: true },
    });

    await prisma.chatMessage.createMany({
      data: [
        { sessionId: workspaceSession.id, role: "USER", content: "Workspace Q" },
        { sessionId: documentSession.id, role: "USER", content: "Doc Q" },
      ],
    });

    const response = await request(app)
      .get(`/api/chat/sessions/${workspaceSession.id}/messages?scope=WORKSPACE`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.messages).toHaveLength(1);
    expect(response.body.messages[0].content).toBe("Workspace Q");

    const mismatchResponse = await request(app)
      .get(`/api/chat/sessions/${documentSession.id}/messages?scope=WORKSPACE`)
      .set("Authorization", `Bearer ${token}`);

    expect(mismatchResponse.status).toBe(400);

    await cleanupUser(email);
  });

  it("scopes reads to document sessions only", async () => {
    const email = `scope-read-document-${Date.now()}@example.com`;
    const { token, workspaceId } = await registerUser(email);
    const user = await prisma.user.findUnique({ where: { email } });

    const document = await prisma.document.create({
      data: {
        userId: user!.id,
        workspaceId,
        title: "Statement",
      },
      select: { id: true },
    });

    const workspaceSession = await prisma.chatSession.create({
      data: {
        userId: user!.id,
        workspaceId,
        scope: "WORKSPACE",
      },
      select: { id: true },
    });

    const documentSession = await prisma.chatSession.create({
      data: {
        userId: user!.id,
        workspaceId,
        scope: "DOCUMENT",
        documentId: document.id,
      },
      select: { id: true },
    });

    await prisma.chatMessage.createMany({
      data: [
        { sessionId: workspaceSession.id, role: "USER", content: "Workspace note" },
        { sessionId: documentSession.id, role: "USER", content: "Document note" },
      ],
    });

    const response = await request(app)
      .get(
        `/api/chat/sessions/${documentSession.id}/messages?scope=DOCUMENT&documentId=${document.id}`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.messages).toHaveLength(1);
    expect(response.body.messages[0].content).toBe("Document note");

    const mismatchResponse = await request(app)
      .get(`/api/chat/sessions/${workspaceSession.id}/messages?scope=DOCUMENT&documentId=${document.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(mismatchResponse.status).toBe(400);

    await cleanupUser(email);
  });
});

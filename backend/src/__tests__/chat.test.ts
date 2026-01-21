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

  it("requires auth", async () => {
    const response = await request(app).get("/api/chat/sessions");
    expect(response.status).toBe(401);
  });

  it("creates sessions in the current workspace", async () => {
    const email = `chat-${Date.now()}@example.com`;

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

    const createSessionResponse = await request(app)
      .post("/api/chat/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(createSessionResponse.status).toBe(201);
    expect(createSessionResponse.body.session.id).toBeDefined();

    const sessionId = createSessionResponse.body.session.id as string;
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });

    expect(session?.workspaceId).toBe(currentWorkspace.body.workspace.id);

    await cleanupUser(email);
  });

  it("creates user and assistant messages", async () => {
    const email = `messages-${Date.now()}@example.com`;

    const registerResponse = await request(app).post("/api/auth/register").send({
      email,
      password: "password123",
      name: "Taylor Bloom",
    });

    expect(registerResponse.status).toBe(201);

    const token = registerResponse.body.token as string;
    const sessionResponse = await request(app)
      .post("/api/chat/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(sessionResponse.status).toBe(201);
    const sessionId = sessionResponse.body.session.id as string;

    const messageResponse = await request(app)
      .post(`/api/chat/sessions/${sessionId}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Summarise my energy bill" });

    expect(messageResponse.status).toBe(201);
    expect(messageResponse.body.message.role).toBe("ASSISTANT");

    const messagesResponse = await request(app)
      .get(`/api/chat/sessions/${sessionId}/messages`)
      .set("Authorization", `Bearer ${token}`);

    expect(messagesResponse.status).toBe(200);
    expect(messagesResponse.body.messages).toHaveLength(2);

    await cleanupUser(email);
  });
});

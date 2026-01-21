import { PrismaClient, WorkspaceRole, WorkspaceType } from "@prisma/client";

const prisma = new PrismaClient();

const toPersonalWorkspaceName = (name: string | null) => {
  const trimmed = name?.trim();
  if (!trimmed) {
    return "Personal";
  }
  const firstName = trimmed.split(/\s+/)[0];
  return `${firstName}'s Paperwork`;
};

const backfill = async () => {
  const users = await prisma.user.findMany({ select: { id: true, name: true } });

  for (const user of users) {
    const existingWorkspace = await prisma.workspace.findFirst({
      where: { ownerId: user.id, type: WorkspaceType.PERSONAL },
    });

    const workspace =
      existingWorkspace ??
      (await prisma.workspace.create({
        data: {
          name: toPersonalWorkspaceName(user.name),
          type: WorkspaceType.PERSONAL,
          ownerId: user.id,
        },
      }));

    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
      update: { role: WorkspaceRole.OWNER },
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        role: WorkspaceRole.OWNER,
      },
    });

    await prisma.document.updateMany({
      where: { userId: user.id, workspaceId: null },
      data: { workspaceId: workspace.id },
    });

    await prisma.chatSession.updateMany({
      where: { userId: user.id, workspaceId: null },
      data: { workspaceId: workspace.id },
    });
  }
};

backfill()
  .then(() => {
    console.log("Workspace backfill complete.");
  })
  .catch((error) => {
    console.error("Workspace backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

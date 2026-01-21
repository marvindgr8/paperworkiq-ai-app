import { WorkspaceType } from "@prisma/client";
import { prisma } from "./prisma.js";

export const getPersonalWorkspace = async (userId: string) => {
  return prisma.workspace.findFirst({
    where: { ownerId: userId, type: WorkspaceType.PERSONAL },
  });
};

export const getAccessibleWorkspace = async (userId: string, workspaceId?: string | null) => {
  if (workspaceId) {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { workspace: true },
    });
    return membership?.workspace ?? null;
  }

  return getPersonalWorkspace(userId);
};

export const ensureWorkspaceAccess = async (userId: string, workspaceId: string) => {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  return Boolean(membership);
};

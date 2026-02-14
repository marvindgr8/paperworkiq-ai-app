import { useEffect, useMemo, useState } from "react";
import type { HomeChatScopePayload } from "@/lib/api";

interface UseHomeChatScopeInput {
  currentFolderId: string | null;
  selectedFileIds: string[];
  selectedFolderIds: string[];
  includeSubfolders?: boolean;
  hasActiveSession: boolean;
}

const serializeScope = (scope: HomeChatScopePayload) =>
  JSON.stringify({
    ...scope,
    fileIds: [...scope.fileIds].sort(),
    folderIds: [...scope.folderIds].sort(),
  });

export const useHomeChatScope = ({
  currentFolderId,
  selectedFileIds,
  selectedFolderIds,
  includeSubfolders = false,
  hasActiveSession,
}: UseHomeChatScopeInput) => {
  const proposedScope = useMemo<HomeChatScopePayload>(() => {
    if (selectedFileIds.length > 0 || selectedFolderIds.length > 0) {
      return {
        scopeType: "selection",
        rootFolderId: null,
        fileIds: selectedFileIds,
        folderIds: selectedFolderIds,
        includeSubfolders: false,
      };
    }

    return {
      scopeType: "folder",
      rootFolderId: currentFolderId,
      fileIds: [],
      folderIds: [],
      includeSubfolders,
    };
  }, [currentFolderId, includeSubfolders, selectedFileIds, selectedFolderIds]);

  const [activeScope, setActiveScope] = useState<HomeChatScopePayload>(proposedScope);
  const [pendingScope, setPendingScope] = useState<HomeChatScopePayload | null>(null);

  useEffect(() => {
    if (!hasActiveSession) {
      setActiveScope(proposedScope);
      setPendingScope(null);
      return;
    }

    if (serializeScope(proposedScope) !== serializeScope(activeScope)) {
      setPendingScope(proposedScope);
      return;
    }

    setPendingScope(null);
  }, [activeScope, hasActiveSession, proposedScope]);

  const requestSwitchScope = () => {
    if (!pendingScope) {
      return;
    }
    setActiveScope(pendingScope);
    setPendingScope(null);
  };

  const keepCurrentScope = () => {
    setPendingScope(null);
  };

  const clearSelection = () => {
    const folderScope: HomeChatScopePayload = {
      scopeType: "folder",
      rootFolderId: currentFolderId,
      fileIds: [],
      folderIds: [],
      includeSubfolders,
    };
    setPendingScope(folderScope);
  };

  return {
    proposedScope,
    activeScope,
    scopeChangePending: Boolean(pendingScope),
    pendingScope,
    actions: {
      requestSwitchScope,
      keepCurrentScope,
      clearSelection,
    },
  };
};

import { createContext, useContext } from "react";

export interface SidebarActions {
  openNewFolderModal: () => void;
  uploadFiles: (files: File[]) => Promise<void> | void;
}

interface AppGateContextValue {
  docCount: number;
  isLoading: boolean;
  error: Error | null;
  refetchDocumentCount: () => Promise<void> | void;
  openUpload: () => void;
  openNewFolder: () => void;
  uploadFilesFromSidebar: (files: File[]) => Promise<void>;
  registerSidebarActions: (actions: SidebarActions | null) => void;
  notifyUploadComplete: () => void;
  uploadSignal: number;
}

export const AppGateContext = createContext<AppGateContextValue | null>(null);

export const useAppGate = () => {
  const context = useContext(AppGateContext);
  if (!context) {
    throw new Error("useAppGate must be used within AppGateContext");
  }
  return context;
};

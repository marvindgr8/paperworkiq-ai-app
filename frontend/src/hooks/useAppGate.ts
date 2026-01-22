import { createContext, useContext } from "react";

interface AppGateContextValue {
  docCount: number;
  isLoading: boolean;
  error: Error | null;
  refetchDocumentCount: () => Promise<void> | void;
  openUpload: () => void;
}

export const AppGateContext = createContext<AppGateContextValue | null>(null);

export const useAppGate = () => {
  const context = useContext(AppGateContext);
  if (!context) {
    throw new Error("useAppGate must be used within AppGateContext");
  }
  return context;
};

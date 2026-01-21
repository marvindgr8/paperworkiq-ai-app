import { createContext, useContext } from "react";
import type { ChatMessageDTO } from "@/types/chat";

interface EvidenceSelectionContextValue {
  selectedMessage: ChatMessageDTO | null;
  setSelectedMessage: (message: ChatMessageDTO | null) => void;
}

export const EvidenceSelectionContext = createContext<EvidenceSelectionContextValue | null>(null);

export const useEvidenceSelection = () => {
  const context = useContext(EvidenceSelectionContext);
  if (!context) {
    throw new Error("useEvidenceSelection must be used within EvidenceSelectionContext");
  }
  return context;
};

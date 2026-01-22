import { createContext, useContext } from "react";
import type { Citation } from "@/types/chat";

export type EvidenceMode = "hidden" | "compact" | "full";

interface EvidenceContextValue {
  mode: EvidenceMode;
  sources: Citation[];
  selectedSource: Citation | null;
  setSelectedSource: (source: Citation | null) => void;
}

export const EvidenceContext = createContext<EvidenceContextValue | null>(null);

export const useEvidenceContext = () => {
  const context = useContext(EvidenceContext);
  if (!context) {
    throw new Error("useEvidenceContext must be used within EvidenceContext");
  }
  return context;
};

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { Citation } from "@/types/chat";

export interface EvidenceSource {
  id: string;
  documentTitle: string;
  documentId?: string;
  page?: number;
  snippet?: string;
  field?: string;
  confidence?: number;
}

interface EvidencePayload {
  sources?: EvidenceSource[];
  selectedSourceId?: string;
}

interface EvidenceContextValue {
  isOpen: boolean;
  openEvidence: (payload?: EvidencePayload) => void;
  closeEvidence: () => void;
  sources: EvidenceSource[];
  selectedSourceId?: string;
  setSources: (sources: EvidenceSource[]) => void;
  setSelectedSourceId: (id?: string) => void;
}

export const buildEvidenceSources = (citations: Citation[] = []): EvidenceSource[] =>
  citations.map((citation, index) => ({
    id: `${citation.documentId}-${citation.page ?? "na"}-${citation.field ?? "note"}-${index}`,
    documentId: citation.documentId,
    documentTitle: citation.documentTitle,
    page: citation.page,
    snippet: citation.snippet,
    field: citation.field,
  }));

export const EvidenceContext = createContext<EvidenceContextValue | null>(null);

export const EvidenceProvider = ({ children }: PropsWithChildren) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sources, setSourcesState] = useState<EvidenceSource[]>([]);
  const [selectedSourceId, setSelectedSourceIdState] = useState<string | undefined>(undefined);

  const setSources = useCallback((nextSources: EvidenceSource[]) => {
    setSourcesState(nextSources);
    setSelectedSourceIdState((current) => {
      if (current && nextSources.some((source) => source.id === current)) {
        return current;
      }
      return nextSources[0]?.id;
    });
  }, []);

  const setSelectedSourceId = useCallback((id?: string) => {
    setSelectedSourceIdState(id);
  }, []);

  const openEvidence = useCallback(
    (payload?: EvidencePayload) => {
      if (payload?.sources) {
        setSources(payload.sources);
      }
      if (payload?.selectedSourceId) {
        setSelectedSourceIdState(payload.selectedSourceId);
      }
      setIsOpen(true);
    },
    [setSources]
  );

  const closeEvidence = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      openEvidence,
      closeEvidence,
      sources,
      selectedSourceId,
      setSources,
      setSelectedSourceId,
    }),
    [isOpen, openEvidence, closeEvidence, sources, selectedSourceId, setSources, setSelectedSourceId]
  );

  return <EvidenceContext.Provider value={value}>{children}</EvidenceContext.Provider>;
};

export const useEvidenceContext = () => {
  const context = useContext(EvidenceContext);
  if (!context) {
    throw new Error("useEvidenceContext must be used within EvidenceContext");
  }
  return context;
};

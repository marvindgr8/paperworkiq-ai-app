import { createContext, useContext } from "react";
import type { DocumentDTO } from "@/lib/api";

interface DocumentSelectionContextValue {
  selectedDocument: DocumentDTO | null;
  setSelectedDocument: (document: DocumentDTO | null) => void;
}

export const DocumentSelectionContext =
  createContext<DocumentSelectionContextValue | null>(null);

export const useDocumentSelection = () => {
  const context = useContext(DocumentSelectionContext);
  if (!context) {
    throw new Error("useDocumentSelection must be used within DocumentSelectionContext");
  }
  return context;
};

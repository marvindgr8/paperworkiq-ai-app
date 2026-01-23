import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { DocumentSearchResult } from "@/lib/api";

interface SidebarSearchContextValue {
  query: string;
  results: DocumentSearchResult[];
  isOpen: boolean;
  isLoading: boolean;
  setQuery: (next: string) => void;
  setResults: (next: DocumentSearchResult[]) => void;
  setIsOpen: (next: boolean) => void;
  setIsLoading: (next: boolean) => void;
  reset: () => void;
}

const SidebarSearchContext = createContext<SidebarSearchContextValue | null>(null);

export const SidebarSearchProvider = ({ children }: { children: ReactNode }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocumentSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const reset = useCallback(() => {
    setResults([]);
    setIsOpen(false);
    setIsLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      query,
      results,
      isOpen,
      isLoading,
      setQuery,
      setResults,
      setIsOpen,
      setIsLoading,
      reset,
    }),
    [query, results, isOpen, isLoading, reset]
  );

  return <SidebarSearchContext.Provider value={value}>{children}</SidebarSearchContext.Provider>;
};

export const useSidebarSearch = () => {
  const context = useContext(SidebarSearchContext);
  if (!context) {
    throw new Error("useSidebarSearch must be used within SidebarSearchProvider");
  }
  return context;
};

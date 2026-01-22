import { useCallback, useEffect, useState } from "react";
import { getDocumentCount } from "@/lib/api";

interface DocumentCountState {
  count: number | null;
  isLoading: boolean;
  error: Error | null;
  hasFetched: boolean;
}

const store: DocumentCountState & { listeners: Set<() => void> } = {
  count: null,
  isLoading: false,
  error: null,
  hasFetched: false,
  listeners: new Set(),
};

const notify = () => {
  store.listeners.forEach((listener) => listener());
};

const setStore = (next: Partial<DocumentCountState>) => {
  Object.assign(store, next);
  notify();
};

const fetchDocumentCount = async () => {
  if (store.isLoading) {
    return;
  }
  setStore({ isLoading: true, error: null });
  try {
    const response = await getDocumentCount();
    if (!response.ok) {
      throw new Error(response.error ?? "Unable to load documents");
    }
    setStore({ count: response.count ?? 0, hasFetched: true });
  } catch (error) {
    setStore({ error: error as Error, hasFetched: true });
  } finally {
    setStore({ isLoading: false });
  }
};

export const useDocumentCount = () => {
  const [snapshot, setSnapshot] = useState<DocumentCountState>({
    count: store.count,
    isLoading: store.isLoading,
    error: store.error,
    hasFetched: store.hasFetched,
  });

  useEffect(() => {
    const handleChange = () => {
      setSnapshot({
        count: store.count,
        isLoading: store.isLoading,
        error: store.error,
        hasFetched: store.hasFetched,
      });
    };

    store.listeners.add(handleChange);
    return () => {
      store.listeners.delete(handleChange);
    };
  }, []);

  useEffect(() => {
    if (!store.hasFetched && !store.isLoading) {
      void fetchDocumentCount();
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchDocumentCount();
  }, []);

  return {
    count: snapshot.count ?? 0,
    isLoading: snapshot.isLoading,
    error: snapshot.error,
    refetch,
  };
};

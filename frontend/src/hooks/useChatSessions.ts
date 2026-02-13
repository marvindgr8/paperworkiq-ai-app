import { useCallback, useEffect, useState } from "react";
import { listChatSessions, createChatSession, type ChatScope } from "@/lib/api";
import type { ChatSessionDTO } from "@/types/chat";

export const useChatSessions = (options: { scope: ChatScope; documentId?: string; folderId?: string }) => {
  const [sessions, setSessions] = useState<ChatSessionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scope = options.scope;
  const documentId = options.documentId;
  const folderId = options.folderId;

  const fetchSessions = useCallback(async () => {
    if (scope === "DOCUMENT" && !documentId) {
      setSessions([]);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await listChatSessions({ scope, documentId, folderId });
      if (!response.ok) {
        setSessions([]);
        setError(response.error ?? "Unable to load sessions");
        return;
      }
      setSessions(response.sessions ?? []);
      setError(null);
    } catch (err) {
      setSessions([]);
      setError("Unable to load sessions");
    } finally {
      setLoading(false);
    }
  }, [scope, documentId, folderId]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  const startNewSession = useCallback(async () => {
    const response = await createChatSession({ scope, documentId, folderId });
    if (response.ok && response.session) {
      setSessions((prev) => [response.session, ...prev]);
      return response.session as ChatSessionDTO;
    }
    throw new Error(response.error ?? "Unable to create session");
  }, [scope, documentId, folderId]);

  return { sessions, loading, error, refresh: fetchSessions, startNewSession };
};

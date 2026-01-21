import { useCallback, useEffect, useState } from "react";
import { listChatSessions, createChatSession } from "@/lib/api";
import type { ChatSessionDTO } from "@/types/chat";

export const useChatSessions = () => {
  const [sessions, setSessions] = useState<ChatSessionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listChatSessions();
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
  }, []);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  const startNewSession = useCallback(async () => {
    const response = await createChatSession();
    if (response.ok && response.session) {
      setSessions((prev) => [response.session, ...prev]);
      return response.session as ChatSessionDTO;
    }
    throw new Error(response.error ?? "Unable to create session");
  }, []);

  return { sessions, loading, error, refresh: fetchSessions, startNewSession };
};

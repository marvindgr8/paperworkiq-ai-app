import { useCallback, useEffect, useState } from "react";
import { listChatMessages, type ChatScope } from "@/lib/api";
import type { ChatMessageDTO } from "@/types/chat";

export const useChatSession = (
  sessionId?: string | null,
  options?: { scope?: ChatScope; documentId?: string }
) => {
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scope = options?.scope;
  const documentId = options?.documentId;

  const fetchMessages = useCallback(async () => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    try {
      setLoading(true);
      const response = await listChatMessages(sessionId, { scope, documentId });
      if (!response.ok) {
        setMessages([]);
        setError(response.error ?? "Unable to load messages");
        return;
      }
      setMessages(response.messages ?? []);
      setError(null);
    } catch (err) {
      setMessages([]);
      setError("Unable to load messages");
    } finally {
      setLoading(false);
    }
  }, [sessionId, scope, documentId]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  return { messages, setMessages, loading, error, refresh: fetchMessages };
};

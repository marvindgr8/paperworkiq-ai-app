import { useCallback, useEffect, useState } from "react";
import { listChatMessages } from "@/lib/api";
import type { ChatMessageDTO } from "@/types/chat";

export const useChatSession = (sessionId?: string | null) => {
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    try {
      setLoading(true);
      const response = await listChatMessages(sessionId);
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
  }, [sessionId]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  return { messages, setMessages, loading, error, refresh: fetchMessages };
};

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatEmptyState from "@/components/chat/ChatEmptyState";
import ChatThread from "@/components/chat/ChatThread";
import { useChatSessions } from "@/hooks/useChatSessions";
import { useChatSession } from "@/hooks/useChatSession";
import { useEvidenceSelection } from "@/hooks/useEvidenceSelection";
import { sendChatMessage } from "@/lib/api";
import type { ChatMessageDTO } from "@/types/chat";

const ChatHome = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const newChatRequested = searchParams.get("new") === "1";
  const { sessions, startNewSession } = useChatSessions();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { messages, setMessages } = useChatSession(activeSessionId ?? undefined);
  const { setSelectedMessage } = useEvidenceSelection();

  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  useEffect(() => {
    if (!newChatRequested) {
      return;
    }
    const createSession = async () => {
      try {
        const session = await startNewSession();
        setActiveSessionId(session.id);
        setMessages([]);
        setSelectedMessage(null);
      } catch (error) {
        setActiveSessionId(null);
      } finally {
        setSearchParams((params) => {
          params.delete("new");
          return params;
        });
      }
    };

    void createSession();
  }, [newChatRequested, setMessages, setSearchParams, setSelectedMessage, startNewSession]);

  useEffect(() => {
    const latestAssistant = [...messages].reverse().find((message) => message.role === "ASSISTANT");
    if (latestAssistant) {
      setSelectedMessage(latestAssistant);
    }
  }, [messages, setSelectedMessage]);

  const handleSend = async (content: string) => {
    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const session = await startNewSession();
        sessionId = session.id;
        setActiveSessionId(sessionId);
      } catch (error) {
        return;
      }
    }

    const timestamp = new Date().toISOString();
    const pendingId = `pending-${Date.now()}`;
    const userMessage: ChatMessageDTO = {
      id: `local-${Date.now()}-user`,
      role: "USER",
      content,
      createdAt: timestamp,
    };
    const pendingMessage: ChatMessageDTO = {
      id: pendingId,
      role: "ASSISTANT",
      content: "Thinking through your paperwork…",
      createdAt: timestamp,
    };

    setMessages((prev) => [...prev, userMessage, pendingMessage]);

    try {
      const response = await sendChatMessage(sessionId, content);
      if (!response.ok || !response.message) {
        setMessages((prev) => prev.filter((message) => message.id !== pendingId));
        return;
      }
      const assistantMessage: ChatMessageDTO = {
        ...response.message,
        citations: response.citations ?? response.message.citations ?? [],
      };
      setMessages((prev) => [
        ...prev.filter((message) => message.id !== pendingId),
        assistantMessage,
      ]);
      setSelectedMessage(assistantMessage);
    } catch (error) {
      setMessages((prev) => prev.filter((message) => message.id !== pendingId));
    }
  };

  const headerDescription = useMemo(() => {
    if (messages.length === 0) {
      return "Ask anything about your documents, bills, and letters.";
    }
    return "Answers are anchored to the exact letter and page.";
  }, [messages.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200/70 bg-white/80 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-slate-500" />
              PaperworkIQ Chat
            </div>
            <p className="text-xs text-slate-500">{headerDescription}</p>
          </div>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
            Personal workspace
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {messages.length === 0 ? (
          <ChatEmptyState />
        ) : (
          <ChatThread messages={messages} onSelectEvidence={setSelectedMessage} />
        )}
      </div>

      <ChatComposer onSend={handleSend} />
    </div>
  );
};

export default ChatHome;

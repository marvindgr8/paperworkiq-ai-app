import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatEmptyState from "@/components/chat/ChatEmptyState";
import ChatUploadEmptyState from "@/components/chat/ChatUploadEmptyState";
import ChatThread from "@/components/chat/ChatThread";
import { useChatSessions } from "@/hooks/useChatSessions";
import { useChatSession } from "@/hooks/useChatSession";
import { useAppGate } from "@/hooks/useAppGate";
import Button from "@/components/ui/Button";
import { sendChatMessage } from "@/lib/api";
import type { ChatMessageDTO } from "@/types/chat";

const ChatHome = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const newChatRequested = searchParams.get("new") === "1";
  const { sessions, startNewSession } = useChatSessions();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { messages, setMessages } = useChatSession(activeSessionId ?? undefined);
  const { docCount, isLoading, openUpload } = useAppGate();
  const uploadFirst = !isLoading && docCount === 0;

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
  }, [newChatRequested, setMessages, setSearchParams, startNewSession]);

  const handleSend = async (content: string) => {
    if (uploadFirst) {
      return;
    }
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
    } catch (error) {
      setMessages((prev) => prev.filter((message) => message.id !== pendingId));
    }
  };

  const headerDescription = useMemo(() => {
    if (messages.length === 0) {
      return uploadFirst
        ? "Upload paperwork to unlock answers with citations."
        : "Ask anything about your documents, bills, and letters.";
    }
    return "Answers are anchored to the exact letter and page.";
  }, [messages.length, uploadFirst]);

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
          <div className="flex items-center gap-3">
            {uploadFirst ? (
              <Button size="sm" onClick={openUpload}>
                Upload
              </Button>
            ) : null}
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
              Personal workspace
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-2xl space-y-4 px-6">
              <div className="h-6 w-40 animate-pulse rounded bg-zinc-200/70" />
              <div className="h-4 w-full animate-pulse rounded bg-zinc-200/60" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-200/60" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          uploadFirst ? (
            <ChatUploadEmptyState />
          ) : (
            <ChatEmptyState />
          )
        ) : (
          <ChatThread messages={messages} />
        )}
      </div>

      <ChatComposer
        onSend={handleSend}
        disabled={uploadFirst || isLoading}
        helperText={
          uploadFirst
            ? "Upload at least one document to ask questions."
            : "Responses are grounded in your uploaded paperwork only. Sources appear when PaperworkIQ cites a letter."
        }
      />
    </div>
  );
};

export default ChatHome;

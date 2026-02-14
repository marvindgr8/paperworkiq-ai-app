import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Minimize2, X } from "lucide-react";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatThread from "@/components/chat/ChatThread";
import ScopeChip from "@/components/chat/ScopeChip";
import Button from "@/components/ui/Button";
import { useChatSession } from "@/hooks/useChatSession";
import { useHomeChatScope } from "@/hooks/useHomeChatScope";
import { createChatSession, sendChatMessage, type HomeChatScopePayload } from "@/lib/api";
import type { ChatMessageDTO } from "@/types/chat";

interface HomeChatDockProps {
  currentFolderId: string | null;
  currentFolderName: string;
  selectedFileIds: string[];
  selectedFolderIds: string[];
  onClearSelection: () => void;
}

const getFolderSessionKey = (scope: HomeChatScopePayload) =>
  `${scope.rootFolderId ?? "root"}:${scope.includeSubfolders}`;

const HomeChatDock = ({
  currentFolderId,
  currentFolderName,
  selectedFileIds,
  selectedFolderIds,
  onClearSelection,
}: HomeChatDockProps) => {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [folderSessionMap, setFolderSessionMap] = useState<Record<string, string>>({});


  const { activeScope, scopeChangePending, actions } = useHomeChatScope({
    currentFolderId,
    selectedFileIds,
    selectedFolderIds,
    hasActiveSession: Boolean(activeSessionId),
  });

  const { messages, setMessages, loading } = useChatSession(activeSessionId);

  useEffect(() => {
    if (activeScope.scopeType === "folder") {
      const key = getFolderSessionKey(activeScope);
      const cachedSessionId = folderSessionMap[key];
      if (cachedSessionId && cachedSessionId !== activeSessionId) {
        setActiveSessionId(cachedSessionId);
      }
    }
  }, [activeScope, activeSessionId, folderSessionMap]);

  const ensureSession = async () => {
    if (activeScope.scopeType === "folder") {
      const key = getFolderSessionKey(activeScope);
      const cachedSessionId = folderSessionMap[key];
      if (cachedSessionId) {
        setActiveSessionId(cachedSessionId);
        return cachedSessionId;
      }
    }

    const response = await createChatSession(activeScope);
    if (!response.ok || !response.session?.id) {
      throw new Error(response.error ?? "Unable to create session");
    }

    const newSessionId = response.session.id as string;
    setActiveSessionId(newSessionId);

    if (activeScope.scopeType === "folder") {
      const key = getFolderSessionKey(activeScope);
      setFolderSessionMap((prev) => ({ ...prev, [key]: newSessionId }));
    }

    setMessages([]);
    return newSessionId;
  };

  const handleSend = async (content: string) => {
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await ensureSession();
    }

    const createdAt = new Date().toISOString();
    const pendingId = `pending-${Date.now()}`;
    const userMessage: ChatMessageDTO = {
      id: `local-${Date.now()}-user`,
      role: "USER",
      content,
      createdAt,
    };
    const pendingMessage: ChatMessageDTO = {
      id: pendingId,
      role: "ASSISTANT",
      content: "Thinking through your files…",
      createdAt,
    };

    setMessages((prev) => [...prev, userMessage, pendingMessage]);

    const response = await sendChatMessage(sessionId, content);
    if (!response.ok || !response.message) {
      setMessages((prev) => prev.filter((message) => message.id !== pendingId));
      return;
    }

    setMessages((prev) => [
      ...prev.filter((message) => message.id !== pendingId),
      {
        ...response.message,
        citations: response.citations ?? [],
      },
    ]);
  };

  const dockContent = useMemo(
    () => (
      <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white shadow-lg">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Assistant</h3>
            <ScopeChip scope={activeScope} currentFolderName={currentFolderName} />
          </div>
          <div className="flex items-center gap-2">
            {activeScope.scopeType === "selection" ? (
              <button
                type="button"
                className="text-xs text-blue-600 underline-offset-2 hover:underline"
                onClick={() => {
                  onClearSelection();
                  actions.clearSelection();
                }}
              >
                Clear selection
              </button>
            ) : null}
            <button type="button" onClick={() => setExpanded(false)} className="text-slate-400">
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {scopeChangePending ? (
          <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p>Selection changed. Switch scope?</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={actions.requestSwitchScope}>Switch</Button>
              <Button size="sm" variant="outline" onClick={actions.keepCurrentScope}>Keep</Button>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1">{loading ? <div className="p-4 text-sm text-slate-500">Loading messages…</div> : <ChatThread messages={messages} />}</div>
        <ChatComposer onSend={(value) => void handleSend(value)} helperText="Scope is sticky per session. Switch scope to start a new context." />
      </div>
    ),
    [actions, activeScope, currentFolderName, loading, messages, onClearSelection, scopeChangePending]
  );

  return (
    <>
      <button
        type="button"
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl md:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <MessageSquare className="h-4 w-4" /> Chat
      </button>

      {!expanded ? (
        <button
          type="button"
          className="fixed bottom-6 right-6 z-30 hidden items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl md:flex"
          onClick={() => setExpanded(true)}
        >
          <MessageSquare className="h-4 w-4" /> Chat
        </button>
      ) : null}

      {expanded ? (
        <aside className="fixed bottom-6 right-6 top-24 z-30 hidden w-[390px] md:block">{dockContent}</aside>
      ) : null}

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-white md:hidden">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">Assistant</span>
            <button type="button" onClick={() => setMobileOpen(false)}>
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
          <div className="h-[calc(100%-57px)] p-3">{dockContent}</div>
        </div>
      ) : null}
    </>
  );
};

export default HomeChatDock;

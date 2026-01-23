import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppHeader from "@/components/app/AppHeader";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatThread from "@/components/chat/ChatThread";
import DocumentPreview from "@/components/documents/DocumentPreview";
import Button from "@/components/ui/Button";
import { useChatSession } from "@/hooks/useChatSession";
import { useChatSessions } from "@/hooks/useChatSessions";
import { useDocumentSelection } from "@/hooks/useDocumentSelection";
import { useEvidenceContext } from "@/hooks/useEvidenceContext";
import {
  deleteDocument,
  downloadDocumentFile,
  getDocument,
  reprocessDocument,
  sendChatMessage,
  type DocumentDTO,
} from "@/lib/api";
import type { ChatMessageDTO } from "@/types/chat";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DocumentActionsMenu from "@/components/documents/DocumentActionsMenu";

const promptChips = [
  "Summarise this document",
  "What is this file?",
  "Are there any important dates?",
  "What action is required?",
];

const DocumentWorkspacePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentDTO | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { messages, setMessages } = useChatSession(activeSessionId ?? undefined);
  const { startNewSession } = useChatSessions();
  const { setSelectedDocument } = useDocumentSelection();
  const { isOpen: evidenceOpen, openEvidence, closeEvidence, sources } = useEvidenceContext();

  useEffect(() => {
    let isMounted = true;
    const fetchDoc = async () => {
      if (!id) {
        return;
      }
      setLoadingDoc(true);
      try {
        const response = await getDocument(id);
        if (isMounted && response.ok) {
          setDocument(response.doc ?? null);
          setSelectedDocument(response.doc ?? null);
        }
      } catch (error) {
        if (isMounted) {
          setDocument(null);
        }
      } finally {
        if (isMounted) {
          setLoadingDoc(false);
        }
      }
    };

    void fetchDoc();
    return () => {
      isMounted = false;
      setSelectedDocument(null);
    };
  }, [id, setSelectedDocument]);

  useEffect(() => {
    setActiveSessionId(null);
    setMessages([]);
  }, [id, setMessages]);

  const handleSend = async (content: string) => {
    if (!id) {
      return;
    }

    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const session = await startNewSession();
        sessionId = session.id;
        setActiveSessionId(sessionId);
        setMessages([]);
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
      content: "Reviewing this document for you…",
      createdAt: timestamp,
    };

    setMessages((prev) => [...prev, userMessage, pendingMessage]);

    try {
      const response = await sendChatMessage(sessionId, content, { documentId: id });
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

  const isProcessing =
    document?.status === "PROCESSING" ||
    document?.status === "UPLOADED" ||
    document?.aiStatus === "PENDING" ||
    document?.aiStatus === "CATEGORIZING";

  const showEvidenceToggle = sources.length > 0;

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="Document workspace"
        subtitle="Ask questions and get answers grounded in this document."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => navigate("/app")}
            >
              Back to Home
            </Button>
            {showEvidenceToggle ? (
              <Button
                size="sm"
                variant={evidenceOpen ? "default" : "outline"}
                onClick={() => {
                  if (evidenceOpen) {
                    closeEvidence();
                  } else {
                    openEvidence();
                  }
                }}
              >
                {evidenceOpen ? "Hide evidence" : "Show evidence"}
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-6 overflow-hidden lg:flex-row">
        <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
          {loadingDoc ? (
            <div className="h-full rounded-[32px] border border-dashed border-zinc-200/70 bg-zinc-50/70" />
          ) : (
            <DocumentPreview
              document={document}
              onRetryProcessing={
                document
                  ? () => {
                      void reprocessDocument(document.id);
                    }
                  : undefined
              }
              actions={
                document ? (
                  <DocumentActionsMenu
                    onDelete={() => setDeleteOpen(true)}
                    onDownload={() => {
                      void downloadDocumentFile(document.id, document.fileName ?? undefined);
                    }}
                  />
                ) : null
              }
            />
          )}
        </div>

        <div className="flex w-full flex-col border-t border-zinc-200/70 lg:w-[420px] lg:border-l lg:border-t-0">
          <div className="border-b border-zinc-200/70 bg-white/80 px-6 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contextual AI</p>
            <h2 className="text-lg font-semibold text-slate-900">Ask AI about this document</h2>
            <p className="text-xs text-slate-500">Questions are scoped to this document.</p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-4">
              {isProcessing ? (
                <div className="rounded-[20px] border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-xs text-amber-700">
                  We’re still preparing this document. Try again in a moment.
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {promptChips.map((prompt) => (
                  <button
                    key={prompt}
                    className="rounded-full border border-zinc-200/70 bg-white px-3 py-1 text-xs text-slate-600"
                    onClick={() => handleSend(prompt)}
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {messages.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-zinc-200/70 bg-zinc-50/70 px-6 py-10 text-center text-sm text-slate-500">
                  Ask a question to start a document-specific conversation.
                </div>
              ) : (
                <div className="h-[420px]">
                  <ChatThread messages={messages} />
                </div>
              )}
            </div>
          </div>

          <ChatComposer
            onSend={handleSend}
            helperText="Questions stay scoped to this document."
            autoFocus
          />
        </div>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        title="Delete this document?"
        description="This can’t be undone."
        confirmLabel="Delete"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (!document) {
            setDeleteOpen(false);
            return;
          }
          await deleteDocument(document.id);
          setDeleteOpen(false);
          navigate("/app", { state: { toast: "Document deleted" } });
        }}
      />
    </div>
  );
};

export default DocumentWorkspacePage;

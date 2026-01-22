import { useEffect, useMemo, useState } from "react";
import { FileText, StickyNote, Table2 } from "lucide-react";
import { useParams } from "react-router-dom";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatThread from "@/components/chat/ChatThread";
import Button from "@/components/ui/Button";
import { getDocument, type DocumentDTO } from "@/lib/api";
import { useDocumentSelection } from "@/hooks/useDocumentSelection";
import type { ChatMessageDTO } from "@/types/chat";

const promptChips = [
  "Summarise this letter",
  "What’s the deadline?",
  "What action is required?",
  "Highlight important dates",
];

const previewTabs = [
  { key: "preview", label: "Preview", icon: FileText },
  { key: "fields", label: "Extracted fields", icon: Table2 },
  { key: "notes", label: "Notes", icon: StickyNote },
] as const;

type PreviewTabKey = (typeof previewTabs)[number]["key"];

const DocSplitViewPage = () => {
  const { id } = useParams();
  const [document, setDocument] = useState<DocumentDTO | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [activeTab, setActiveTab] = useState<PreviewTabKey>("preview");
  const [loadingDoc, setLoadingDoc] = useState(true);
  const { setSelectedDocument } = useDocumentSelection();

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

  const title = document?.title ?? document?.fileName ?? "Untitled document";
  const createdAtLabel = document?.createdAt
    ? new Date(document.createdAt).toLocaleDateString()
    : "—";

  const handleSend = (content: string) => {
    if (!id) {
      return;
    }
    const timestamp = new Date().toISOString();
    const userMessage: ChatMessageDTO = {
      id: `local-${Date.now()}-user`,
      role: "USER",
      content,
      createdAt: timestamp,
    };
    const assistantMessage: ChatMessageDTO = {
      id: `local-${Date.now()}-assistant`,
      role: "ASSISTANT",
      content: `I’m ready to help with ${title}. Ask any question and I’ll highlight citations soon.`,
      createdAt: timestamp,
      citations: [],
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
  };

  const headerSubtitle = useMemo(() => {
    if (!document) {
      return "Gathering the document details.";
    }
    return "Ask questions and get answers grounded in this document.";
  }, [document]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200/70 bg-white/80 px-6 py-5">
        <h1 className="text-lg font-semibold text-slate-900">Document workspace</h1>
        <p className="text-xs text-slate-500">{headerSubtitle}</p>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-hidden lg:flex-row">
        <div className="flex flex-1 flex-col border-r border-zinc-200/70">
          <div className="border-b border-zinc-200/70 bg-white/80 px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Document</p>
                <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                <p className="text-xs text-slate-500">
                  {document?.status ?? "Processing"} · {createdAtLabel}
                </p>
              </div>
              <Button size="sm" variant="outline">
                Download
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {previewTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={
                    activeTab === tab.key
                      ? "flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                      : "flex items-center gap-2 rounded-full border border-zinc-200/70 bg-white px-3 py-1 text-xs text-slate-500"
                  }
                  onClick={() => setActiveTab(tab.key)}
                  type="button"
                >
                  <tab.icon className="h-3 w-3" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {loadingDoc ? (
              <div className="h-full rounded-[32px] border border-dashed border-zinc-200/70 bg-zinc-50/70" />
            ) : activeTab === "preview" ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[32px] border border-dashed border-zinc-200/70 bg-zinc-50/70 px-6 py-10 text-center">
                <FileText className="h-6 w-6 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Preview placeholder</p>
                  <p className="text-xs text-slate-500">
                    PDF preview and pages will appear here once processing is ready.
                  </p>
                </div>
              </div>
            ) : activeTab === "fields" ? (
              <div className="rounded-[32px] border border-zinc-200/70 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Extracted fields</p>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Reference number</span>
                    <span className="text-slate-400">—</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Due date</span>
                    <span className="text-slate-400">—</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Amount</span>
                    <span className="text-slate-400">—</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[32px] border border-zinc-200/70 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Notes</p>
                <p className="mt-2 text-sm text-slate-500">
                  Add reminders or context for this document soon.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full flex-col lg:w-[420px]">
          <div className="border-b border-zinc-200/70 bg-white/80 px-6 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contextual AI</p>
            <h2 className="text-lg font-semibold text-slate-900">Ask AI about this document</h2>
            <p className="text-xs text-slate-500">
              Questions are scoped to this document (ID: {id}).
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-4">
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

          <ChatComposer onSend={handleSend} helperText="Questions stay scoped to this document." />
        </div>
      </div>
    </div>
  );
};

export default DocSplitViewPage;

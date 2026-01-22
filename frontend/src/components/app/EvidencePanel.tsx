import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { FileText, Quote, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useEvidenceSelection } from "@/hooks/useEvidenceSelection";
import { useDocumentSelection } from "@/hooks/useDocumentSelection";
import { useAppGate } from "@/hooks/useAppGate";
import Button from "@/components/ui/Button";
import type { Citation } from "@/types/chat";

interface EvidencePanelProps {
  className?: string;
}

const EvidencePanel = ({ className }: EvidencePanelProps) => {
  const { docCount, isLoading, openUpload } = useAppGate();
  const { selectedMessage } = useEvidenceSelection();
  const { selectedDocument } = useDocumentSelection();
  const location = useLocation();
  const citations = selectedMessage?.citations ?? [];
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const showUploadFirst = !isLoading && docCount === 0;
  const isInbox = location.pathname.startsWith("/app/inbox");
  const showSelectedDocument = isInbox && Boolean(selectedDocument) && citations.length === 0;

  useEffect(() => {
    if (citations.length > 0) {
      setActiveCitation(citations[0]);
    } else {
      setActiveCitation(null);
    }
  }, [citations]);

  const activeTitle = useMemo(() => {
    if (activeCitation) {
      return activeCitation.documentTitle;
    }
    if (showSelectedDocument) {
      return selectedDocument.title ?? selectedDocument.fileName ?? "Evidence";
    }
    return "Evidence";
  }, [activeCitation, selectedDocument, showSelectedDocument]);

  if (showUploadFirst) {
    return (
      <aside
        className={clsx(
          "flex h-full w-80 flex-col gap-4 border-l border-zinc-200/70 bg-white/80 px-5 py-6",
          className
        )}
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Evidence</p>
          <h2 className="text-lg font-semibold text-slate-900">Waiting for your first upload</h2>
          <p className="text-sm text-slate-500">
            Evidence appears as soon as you add a document to your inbox.
          </p>
        </div>
        <div className="mt-auto">
          <Button size="sm" onClick={openUpload}>
            Upload a document
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={clsx(
        "flex h-full w-96 flex-col gap-6 border-l border-zinc-200/70 bg-white/80 px-5 py-6",
        className
      )}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Evidence</p>
        <h2 className="text-lg font-semibold text-slate-900">{activeTitle}</h2>
        <p className="text-sm text-slate-500">
          Every answer is anchored to the exact letter, page, and line.
        </p>
      </div>

      {citations.length === 0 ? (
        showSelectedDocument ? (
          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            <div className="rounded-[28px] border border-zinc-200/70 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Selected document
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {selectedDocument?.title ?? selectedDocument?.fileName ?? "Untitled document"}
              </p>
              <p className="text-xs text-slate-500">Status: {selectedDocument?.status}</p>
            </div>
            <div className="rounded-[28px] border border-dashed border-zinc-200/70 bg-zinc-50 px-4 py-6 text-center text-xs text-slate-400">
              Document preview placeholder
            </div>
            <div className="rounded-[28px] border border-zinc-200/70 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Highlights</p>
              <p className="mt-2 text-xs text-slate-500">
                Select a citation in chat to see the exact excerpt here.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-zinc-200/80 bg-zinc-50/70 px-6 text-center">
            <Sparkles className="h-6 w-6 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-700">No cited sources yet.</p>
              <p className="text-xs text-slate-500">
                Answers will cite the exact letter and page as soon as documents are uploaded.
              </p>
            </div>
          </div>
        )
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Cited sources
            </p>
            <div className="space-y-2">
              {citations.map((citation) => (
                <button
                  key={`${citation.documentId}-${citation.page ?? ""}-${citation.snippet ?? ""}`}
                  className={clsx(
                    "w-full rounded-2xl border px-3 py-2 text-left text-sm transition",
                    activeCitation?.documentId === citation.documentId
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-zinc-200/70 bg-white text-slate-700 hover:border-slate-300"
                  )}
                  onClick={() => setActiveCitation(citation)}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{citation.documentTitle}</span>
                    {citation.page ? <span className="text-xs">p.{citation.page}</span> : null}
                  </div>
                  {citation.snippet ? (
                    <p className="mt-1 text-xs opacity-80">{citation.snippet}</p>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-[28px] border border-zinc-200/70 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4" />
              Document preview
            </div>
            <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-zinc-200/70 bg-zinc-50 text-xs text-slate-500">
              PDF preview placeholder
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Quote className="h-4 w-4" />
              Highlight
            </div>
            <p className="rounded-2xl bg-zinc-50 px-3 py-2 text-xs text-slate-600">
              {activeCitation?.snippet ?? "Select a citation to see the exact excerpt."}
            </p>
          </div>

          <div className="rounded-[28px] border border-zinc-200/70 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Extracted fields</p>
            <div className="mt-3 space-y-2 text-xs text-slate-500">
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
        </div>
      )}
    </aside>
  );
};

export default EvidencePanel;

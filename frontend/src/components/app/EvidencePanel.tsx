import { useMemo } from "react";
import { FileText, Quote, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useEvidenceContext } from "@/hooks/useEvidenceContext";
import { useDocumentSelection } from "@/hooks/useDocumentSelection";
import { useAppGate } from "@/hooks/useAppGate";
import Button from "@/components/ui/Button";

interface EvidencePanelProps {
  className?: string;
}

const EvidencePanel = ({ className }: EvidencePanelProps) => {
  const { docCount, isLoading, openUpload } = useAppGate();
  const { mode, sources, selectedSource, setSelectedSource } = useEvidenceContext();
  const { selectedDocument } = useDocumentSelection();
  const showUploadFirst = !isLoading && docCount === 0;
  const showSelectedDocument = Boolean(selectedDocument) && sources.length === 0;

  const activeTitle = useMemo(() => {
    if (selectedSource) {
      return selectedSource.documentTitle;
    }
    if (showSelectedDocument) {
      return selectedDocument.title ?? selectedDocument.fileName ?? "Evidence";
    }
    return "Evidence";
  }, [selectedSource, selectedDocument, showSelectedDocument]);

  if (mode === "compact") {
    return (
      <aside
        className={clsx(
          "flex h-full w-72 flex-col gap-4 border-l border-zinc-200/70 bg-white/80 px-5 py-6",
          className
        )}
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Evidence</p>
          <h2 className="text-lg font-semibold text-slate-900">Evidence stays out of the way</h2>
          <p className="text-sm text-slate-500">
            Ask a question in chat to see cited sources and highlights.
          </p>
        </div>
        <div className="mt-auto rounded-[20px] border border-dashed border-zinc-200/70 bg-zinc-50 px-4 py-4 text-xs text-slate-400">
          Evidence appears when you ask questions.
        </div>
      </aside>
    );
  }

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

      {sources.length === 0 ? (
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
              {sources.map((citation) => (
                <button
                  key={`${citation.documentId}-${citation.page ?? ""}-${citation.snippet ?? ""}`}
                  className={clsx(
                    "w-full rounded-2xl border px-3 py-2 text-left text-sm transition",
                    selectedSource?.documentId === citation.documentId
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-zinc-200/70 bg-white text-slate-700 hover:border-slate-300"
                  )}
                  onClick={() => setSelectedSource(citation)}
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
              {selectedSource?.snippet ?? "Select a citation to see the exact excerpt."}
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

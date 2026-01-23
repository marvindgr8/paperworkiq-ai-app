import { useEffect, useMemo, useState } from "react";
import { FileText, Quote, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useEvidenceContext } from "@/hooks/useEvidenceContext";
import { useDocumentSelection } from "@/hooks/useDocumentSelection";
import { getDocument } from "@/lib/api";
import type { DocumentDTO } from "@/lib/api";
import DocumentPreview from "@/components/documents/DocumentPreview";

interface EvidencePanelProps {
  className?: string;
}

const EvidencePanel = ({ className }: EvidencePanelProps) => {
  const { sources, selectedSourceId, setSelectedSourceId } = useEvidenceContext();
  const { selectedDocument } = useDocumentSelection();
  const showSelectedDocument = Boolean(selectedDocument) && sources.length === 0;
  const selectedSource = sources.find((source) => source.id === selectedSourceId) ?? sources[0];
  const previewDocumentId = selectedSource?.documentId ?? selectedDocument?.id;
  const [evidenceDocument, setEvidenceDocument] = useState<DocumentDTO | null>(null);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const activeDocument = showSelectedDocument ? selectedDocument : evidenceDocument;

  const activeTitle = useMemo(() => {
    if (selectedSource) {
      return selectedSource.documentTitle;
    }
    if (showSelectedDocument) {
      return selectedDocument.title ?? selectedDocument.fileName ?? "Evidence";
    }
    return "Evidence";
  }, [selectedSource, selectedDocument, showSelectedDocument]);

  useEffect(() => {
    let isMounted = true;
    const fetchDocumentDetails = async () => {
      if (!previewDocumentId) {
        setEvidenceDocument(null);
        setIsDocumentLoading(false);
        return;
      }
      if (showSelectedDocument && selectedDocument?.id === previewDocumentId) {
        setEvidenceDocument(selectedDocument);
        setIsDocumentLoading(false);
        return;
      }
      setIsDocumentLoading(true);
      try {
        const response = await getDocument(previewDocumentId);
        if (isMounted) {
          setEvidenceDocument(response.ok ? (response.doc ?? null) : null);
        }
      } catch (error) {
        if (isMounted) {
          setEvidenceDocument(null);
        }
      } finally {
        if (isMounted) {
          setIsDocumentLoading(false);
        }
      }
    };

    void fetchDocumentDetails();

    return () => {
      isMounted = false;
    };
  }, [previewDocumentId, selectedDocument, showSelectedDocument]);

  return (
    <aside
      className={clsx(
        "flex h-full flex-col gap-6 overflow-hidden bg-white/80 px-5 py-6",
        className
      )}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Evidence</p>
        <h2 className="text-lg font-semibold text-slate-900">{activeTitle}</h2>
        <p className="text-sm text-slate-500">
          Every answer is anchored to the exact document, page, and line.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {sources.length === 0 ? (
          showSelectedDocument ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-[28px] border border-zinc-200/70 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Selected document
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedDocument?.title ?? selectedDocument?.fileName ?? "Untitled document"}
                </p>
                <p className="text-xs text-slate-500">Status: {selectedDocument?.status}</p>
              </div>
              <div className="space-y-3 rounded-[28px] border border-zinc-200/70 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileText className="h-4 w-4" />
                  Document preview
                </div>
                {isDocumentLoading ? (
                  <div className="flex h-40 items-center justify-center rounded-2xl bg-zinc-50 text-xs text-slate-500">
                    Loading preview…
                  </div>
                ) : (
                  <DocumentPreview
                    document={activeDocument}
                    showHeader={false}
                    showTabs={false}
                    size="compact"
                    className="border-0 bg-transparent p-0 shadow-none"
                  />
                )}
              </div>
              <div className="rounded-[28px] border border-zinc-200/70 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Highlights</p>
                <p className="mt-2 text-xs text-slate-500">
                  Select a citation in chat to see the exact excerpt here.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-zinc-200/80 bg-zinc-50/70 px-6 py-10 text-center">
              <Sparkles className="h-6 w-6 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">No sources for this answer.</p>
                <p className="text-xs text-slate-500">
                  Sources appear when PaperworkIQ cites a specific document or page.
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Cited sources
              </p>
              <div className="space-y-2">
                {sources.map((citation) => (
                  <button
                    key={citation.id}
                    className={clsx(
                      "w-full rounded-2xl border px-3 py-2 text-left text-sm transition",
                      selectedSource?.id === citation.id
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-zinc-200/70 bg-white text-slate-700 hover:border-slate-300"
                    )}
                    onClick={() => setSelectedSourceId(citation.id)}
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
              {isDocumentLoading ? (
                <div className="flex h-40 items-center justify-center rounded-2xl bg-zinc-50 text-xs text-slate-500">
                  Loading preview…
                </div>
              ) : (
                <DocumentPreview
                  document={activeDocument}
                  showHeader={false}
                  showTabs={false}
                  size="compact"
                  className="border-0 bg-transparent p-0 shadow-none"
                />
              )}
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Quote className="h-4 w-4" />
                Highlights
              </div>
              <p className="rounded-2xl bg-zinc-50 px-3 py-2 text-xs text-slate-600">
                {selectedSource?.snippet ?? "Select a citation to see the exact excerpt."}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default EvidencePanel;

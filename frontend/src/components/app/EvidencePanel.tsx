import { useEffect, useMemo, useState } from "react";
import { FileText, Quote, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useEvidenceContext } from "@/hooks/useEvidenceContext";
import { useDocumentSelection } from "@/hooks/useDocumentSelection";
import { fetchDocumentPreviewUrl, getDocument } from "@/lib/api";
import type { DocumentDTO } from "@/lib/api";

interface EvidencePanelProps {
  className?: string;
}

const EvidencePanel = ({ className }: EvidencePanelProps) => {
  const { sources, selectedSourceId, setSelectedSourceId } = useEvidenceContext();
  const { selectedDocument } = useDocumentSelection();
  const showSelectedDocument = Boolean(selectedDocument) && sources.length === 0;
  const selectedSource = sources.find((source) => source.id === selectedSourceId) ?? sources[0];
  const previewDocumentId = selectedSource?.documentId ?? selectedDocument?.id;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [evidenceDocument, setEvidenceDocument] = useState<DocumentDTO | null>(null);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const activeDocument = showSelectedDocument ? selectedDocument : evidenceDocument;
  const isPreviewReady = activeDocument ? activeDocument.status === "READY" : true;
  const isPdf = activeDocument?.mimeType === "application/pdf";

  const activeTitle = useMemo(() => {
    if (selectedSource) {
      return selectedSource.documentTitle;
    }
    if (showSelectedDocument) {
      return selectedDocument.title ?? selectedDocument.fileName ?? "Evidence";
    }
    return "Evidence";
  }, [selectedSource, selectedDocument, showSelectedDocument]);

  const fields = useMemo(() => {
    if (!activeDocument) {
      return [];
    }
    const primaryFields =
      activeDocument.fields?.map((field) => ({
        label: field.key,
        value:
          field.valueText ??
          field.valueNumber?.toString() ??
          field.valueDate ??
          "",
      })) ?? [];

    const legacyFields = (() => {
      const data = activeDocument.extractData;
      if (!data || typeof data !== "object") {
        return [];
      }
      const typedData = data as {
        fields?: Array<Record<string, unknown>>;
        extractedFields?: Array<{ label?: string; value?: string }>;
      };
      const extracted =
        typedData.extractedFields?.map((field) => ({
          label: String(field.label ?? ""),
          value: String(field.value ?? ""),
        })) ?? [];
      const legacy = typedData.fields?.map((field) => ({
        label: String(field.key ?? ""),
        value: String(field.valueText ?? field.value ?? ""),
      })) ?? [];
      return [...extracted, ...legacy];
    })();

    return [...primaryFields, ...legacyFields].filter((field) => field.label && field.value);
  }, [activeDocument]);

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
        const document = await getDocument(previewDocumentId);
        if (isMounted) {
          setEvidenceDocument(document);
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

  useEffect(() => {
    let isMounted = true;
    const fetchPreview = async () => {
      if (!previewDocumentId) {
        setPreviewUrl(null);
        setPreviewError(null);
        setImageFailed(false);
        return;
      }
      if (!isPreviewReady) {
        setPreviewUrl(null);
        setPreviewError("Preview not ready yet.");
        setImageFailed(false);
        return;
      }
      setIsPreviewLoading(true);
      setPreviewError(null);
      setImageFailed(false);
      try {
        const url = await fetchDocumentPreviewUrl(previewDocumentId);
        if (isMounted) {
          setPreviewUrl((prev) => {
            if (prev) {
              URL.revokeObjectURL(prev);
            }
            return url;
          });
        } else {
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        if (isMounted) {
          setPreviewError("Preview unavailable.");
          setPreviewUrl(null);
        }
      } finally {
        if (isMounted) {
          setIsPreviewLoading(false);
        }
      }
    };

    void fetchPreview();

    return () => {
      isMounted = false;
    };
  }, [isPreviewReady, previewDocumentId]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
                {isPreviewLoading ? (
                  <div className="flex h-40 items-center justify-center rounded-2xl bg-zinc-50 text-xs text-slate-500">
                    Loading preview…
                  </div>
                ) : previewError ? (
                  <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-zinc-200/70 bg-zinc-50 text-xs text-slate-500">
                    {previewError}
                  </div>
                ) : previewUrl ? (
                  isPdf || imageFailed ? (
                    <iframe
                      title="Document preview"
                      src={previewUrl}
                      className="h-40 w-full rounded-2xl bg-zinc-50"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt={activeTitle}
                      className="h-40 w-full rounded-2xl object-contain"
                      onError={() => setImageFailed(true)}
                    />
                  )
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-zinc-200/70 bg-zinc-50 text-xs text-slate-500">
                    Preview unavailable.
                  </div>
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
              {isPreviewLoading ? (
                <div className="flex h-40 items-center justify-center rounded-2xl bg-zinc-50 text-xs text-slate-500">
                  Loading preview…
                </div>
              ) : previewError ? (
                <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-zinc-200/70 bg-zinc-50 text-xs text-slate-500">
                  {previewError}
                </div>
              ) : previewUrl ? (
                isPdf || imageFailed ? (
                  <iframe
                    title="Document preview"
                    src={previewUrl}
                    className="h-40 w-full rounded-2xl bg-zinc-50"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt={activeTitle}
                    className="h-40 w-full rounded-2xl object-contain"
                    onError={() => setImageFailed(true)}
                  />
                )
              ) : (
                <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-zinc-200/70 bg-zinc-50 text-xs text-slate-500">
                  Preview unavailable.
                </div>
              )}
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
              <p className="text-xs text-slate-500">Key details found in this document</p>
              {activeDocument?.sensitiveDetected ? (
                <div className="mt-3 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-xs text-amber-700">
                  Sensitive document detected. Extracted fields are limited.
                </div>
              ) : null}
              {isDocumentLoading ? (
                <p className="mt-3 text-sm text-slate-500">Loading extracted fields…</p>
              ) : fields.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  {activeDocument?.status === "PROCESSING" || activeDocument?.status === "UPLOADED"
                    ? "Fields will appear after processing finishes."
                    : "No key details found yet."}
                </p>
              ) : (
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {fields.map((field) => (
                    <div
                      key={`${field.label}-${field.value}`}
                      className="flex items-center justify-between"
                    >
                      <span>{field.label}</span>
                      <span className="text-slate-400">{String(field.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default EvidencePanel;

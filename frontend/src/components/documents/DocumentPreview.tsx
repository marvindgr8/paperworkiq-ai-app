import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import type { DocumentDTO } from "@/lib/api";
import { fetchDocumentPreviewUrl } from "@/lib/api";
import Button from "@/components/ui/Button";

interface DocumentPreviewProps {
  document: DocumentDTO | null;
  actions?: ReactNode;
  onRetryProcessing?: () => void;
}

const statusStyles: Record<string, string> = {
  READY: "bg-emerald-50 text-emerald-700",
  PROCESSING: "bg-amber-50 text-amber-700",
  FAILED: "bg-rose-50 text-rose-700",
  UPLOADED: "bg-slate-100 text-slate-600",
};

const formatStatus = (status: string) =>
  status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const buildFieldList = (document: DocumentDTO | null) => {
  if (!document) {
    return [];
  }
  const fields =
    document.fields?.map((field) => ({
      label: field.key,
      value:
        field.valueText ??
        field.valueNumber?.toString() ??
        field.valueDate ??
        "",
    })) ?? [];

  const legacyFields = (() => {
    const data = document.extractData;
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

  return [...fields, ...legacyFields].filter((field) => field.label && field.value);
};

const DocumentPreview = ({ document, actions, onRetryProcessing }: DocumentPreviewProps) => {
  const [activeTab, setActiveTab] = useState<"preview" | "fields" | "text">("preview");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showOcr, setShowOcr] = useState(false);

  const fields = useMemo(() => buildFieldList(document), [document]);
  const isPdf = document?.mimeType === "application/pdf";
  const status = document?.status ?? "UPLOADED";
  const statusLabel = formatStatus(status);
  const badgeClass = statusStyles[status] ?? "bg-slate-100 text-slate-600";
  const rawText = document?.rawText ?? "";

  useEffect(() => {
    setActiveTab("preview");
    setShowOcr(false);
  }, [document?.id]);

  useEffect(() => {
    let isMounted = true;
    const fetchPreview = async () => {
      if (!document || document.status !== "READY") {
        setPreviewUrl(null);
        setPreviewError(null);
        return;
      }
      setIsPreviewLoading(true);
      setPreviewError(null);
      try {
        const url = await fetchDocumentPreviewUrl(document.id);
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
          setPreviewError("Preview not available yet.");
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
  }, [document]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!document) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-[32px] border border-dashed border-zinc-200/70 bg-zinc-50/70 px-6 py-10 text-center">
        <FileText className="h-6 w-6 text-slate-400" />
        <p className="mt-2 text-sm font-medium text-slate-700">Select a document</p>
        <p className="text-xs text-slate-500">
          Choose a document from the list to see its preview.
        </p>
      </div>
    );
  }

  const title = document.title ?? document.fileName ?? "Untitled document";
  const createdAtLabel = document.createdAt
    ? new Date(document.createdAt).toLocaleDateString()
    : "—";

  const processedAtLabel = document.processedAt
    ? new Date(document.processedAt).toLocaleString()
    : "Not processed yet";

  const ocrWordCount = rawText ? rawText.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-4 rounded-[32px] border border-zinc-200/70 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Document</p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-slate-500">{createdAtLabel}</p>
          {document.processingError ? (
            <p className="text-xs text-rose-500">{document.processingError}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status === "FAILED" && onRetryProcessing ? (
            <Button size="sm" variant="outline" onClick={onRetryProcessing}>
              Retry processing
            </Button>
          ) : null}
          {actions}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "preview", label: "Preview" },
          { id: "fields", label: "Extracted fields" },
          { id: "text", label: "Text (OCR)" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={
              activeTab === tab.id
                ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                : "rounded-full border border-zinc-200/70 bg-white px-3 py-1 text-xs text-slate-500"
            }
            onClick={() => setActiveTab(tab.id as "preview" | "fields" | "text")}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "preview" ? (
        <div className="rounded-[28px] border border-zinc-200/70 bg-white p-4 shadow-sm">
          {status !== "READY" ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-dashed border-zinc-200/70 bg-zinc-50/70 text-sm text-slate-500">
              Preview not ready yet.
            </div>
          ) : isPreviewLoading ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-[24px] bg-zinc-50/70 text-sm text-slate-500">
              Loading preview…
            </div>
          ) : previewError ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-dashed border-zinc-200/70 bg-zinc-50/70 text-sm text-slate-500">
              {previewError}
            </div>
          ) : previewUrl ? (
            isPdf ? (
              <div className="flex min-h-[520px] items-center justify-center rounded-[24px] bg-zinc-50/50 p-4">
                <iframe
                  title="PDF preview"
                  src={previewUrl}
                  className="h-[520px] w-full rounded-2xl"
                />
              </div>
            ) : (
              <div className="flex min-h-[520px] items-center justify-center rounded-[24px] bg-zinc-50/50 p-4">
                <img
                  src={previewUrl}
                  alt={title}
                  className="max-h-[520px] rounded-2xl object-contain"
                />
              </div>
            )
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-dashed border-zinc-200/70 bg-zinc-50/70 text-sm text-slate-500">
              Preview unavailable.
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "fields" ? (
        <div className="rounded-[28px] border border-zinc-200/70 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Extracted fields</p>
              <p className="text-xs text-slate-500">Key details found in this document</p>
            </div>
            {fields.length === 0 && onRetryProcessing ? (
              <Button size="sm" variant="outline" onClick={onRetryProcessing}>
                Re-run extraction
              </Button>
            ) : null}
          </div>
          {document.sensitiveDetected ? (
            <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-xs text-amber-700">
              Sensitive document detected. Extracted fields are limited.
            </div>
          ) : null}
          {fields.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              {status === "PROCESSING" || status === "UPLOADED"
                ? "Fields will appear after processing finishes."
                : "No key details found yet."}
            </p>
          ) : (
            <div className="mt-4 space-y-2 text-sm text-slate-600">
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
      ) : null}

      {activeTab === "text" ? (
        <div className="rounded-[28px] border border-zinc-200/70 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Text (OCR)</p>
              <p className="text-xs text-slate-500">
                {ocrWordCount} words · Processed {processedAtLabel}
              </p>
            </div>
          </div>
          {!showOcr ? (
            <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-xs text-amber-700">
              <p>May contain sensitive text. Click to reveal.</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setShowOcr(true)}
              >
                Show OCR
              </Button>
            </div>
          ) : rawText ? (
            <pre className="mt-4 max-h-[360px] whitespace-pre-wrap rounded-2xl bg-zinc-50 p-4 text-xs text-slate-600">
              {rawText}
            </pre>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No OCR text available yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default DocumentPreview;

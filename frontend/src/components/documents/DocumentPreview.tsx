import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import clsx from "clsx";
import type { DocumentDTO } from "@/lib/api";
import { fetchDocumentPreviewUrl } from "@/lib/api";
import Button from "@/components/ui/Button";

interface DocumentPreviewProps {
  document: DocumentDTO | null;
  actions?: ReactNode;
  onRetryProcessing?: () => void;
  showHeader?: boolean;
  size?: "default" | "compact";
  className?: string;
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

const formatProcessingError = (processingError?: string | null) => {
  if (!processingError) {
    return null;
  }
  const lower = processingError.toLowerCase();
  if (lower.includes("bad xref")) {
    return {
      title: "We couldn't read this PDF (bad XRef entry).",
      hint:
        "Try re-exporting or repairing the PDF (Save As/Print to PDF), then upload it again.",
    };
  }
  return { title: processingError };
};

const DocumentPreview = ({
  document,
  actions,
  onRetryProcessing,
  showHeader = true,
  size = "default",
  className,
}: DocumentPreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const mimeType = document?.mimeType ?? "";
  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
  const canInlineFramePreview =
    isPdf ||
    isImage ||
    mimeType === "text/csv" ||
    mimeType === "application/csv" ||
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const status = document?.status ?? "UPLOADED";
  const displayStatus = status === "FAILED" && previewUrl ? "READY" : status;
  const statusLabel = formatStatus(displayStatus);
  const badgeClass = statusStyles[displayStatus] ?? "bg-slate-100 text-slate-600";
  const processingErrorMessage = useMemo(
    () => formatProcessingError(document?.processingError),
    [document?.processingError]
  );


  useEffect(() => {
    let isMounted = true;
    const fetchPreview = async () => {
      if (!document) {
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
      <div
        className={clsx(
          "flex h-full flex-col items-center justify-center rounded-[32px] border border-dashed border-zinc-200/70 bg-zinc-50/70 text-center",
          size === "compact" ? "px-4 py-6" : "px-6 py-10",
          className
        )}
      >
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

  return (
    <div
      className={clsx(
        "rounded-[32px] border border-zinc-200/70 bg-white shadow-sm",
        size === "compact" ? "p-4" : "p-5",
        showHeader ? "space-y-4" : "",
        className
      )}
    >
      {showHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500">Uploaded {createdAtLabel}</p>
            {processingErrorMessage && displayStatus === "FAILED" ? (
              <div className="space-y-1 text-xs text-rose-500">
                <p>{processingErrorMessage.title}</p>
                {processingErrorMessage.hint ? (
                  <p className="text-rose-400">{processingErrorMessage.hint}</p>
                ) : null}
              </div>
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
      ) : null}

      <div className="rounded-[28px] border border-zinc-200/70 bg-white p-4 shadow-sm">
          {isPreviewLoading ? (
            <div
              className={clsx(
                "flex items-center justify-center rounded-[24px] bg-zinc-50/70 text-sm text-slate-500",
                size === "compact" ? "h-40" : "min-h-[420px]"
              )}
            >
              Loading preview…
            </div>
          ) : previewError ? (
            <div
              className={clsx(
                "flex items-center justify-center rounded-[24px] border border-dashed border-zinc-200/70 bg-zinc-50/70 text-sm text-slate-500",
                size === "compact" ? "h-40" : "min-h-[420px]"
              )}
            >
              {status === "READY" ? previewError : "Preview not ready yet."}
            </div>
          ) : previewUrl ? (
            isPdf || !isImage ? (
              <div
                className={clsx(
                  "flex items-center justify-center rounded-[24px] bg-zinc-50/50 p-4",
                  size === "compact" ? "h-40" : "min-h-[520px]"
                )}
              >
                {canInlineFramePreview ? (
                  <iframe
                    title="Document preview"
                    src={previewUrl}
                    className={clsx(
                      "w-full rounded-2xl",
                      size === "compact" ? "h-40" : "h-[520px]"
                    )}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200/70 bg-white p-6 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Inline preview isn't supported for this file type.
                    </p>
                    <p className="text-xs text-slate-500">
                      Open it in a new tab to review the uploaded file.
                    </p>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-zinc-200/80 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-zinc-50"
                    >
                      Open file
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={clsx(
                  "flex items-center justify-center rounded-[24px] bg-zinc-50/50 p-4",
                  size === "compact" ? "h-40" : "min-h-[520px]"
                )}
              >
                <img
                  src={previewUrl}
                  alt={title}
                  className={clsx(
                    "rounded-2xl object-contain",
                    size === "compact" ? "h-40 w-full" : "max-h-[520px]"
                  )}
                />
              </div>
            )
          ) : (
            <div
              className={clsx(
                "flex items-center justify-center rounded-[24px] border border-dashed border-zinc-200/70 bg-zinc-50/70 text-sm text-slate-500",
                size === "compact" ? "h-40" : "min-h-[420px]"
              )}
            >
              Preview unavailable.
            </div>
          )}
        </div>

    </div>
  );
};

export default DocumentPreview;

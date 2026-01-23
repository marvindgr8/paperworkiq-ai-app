import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import type { DocumentDTO } from "@/lib/api";
import Button from "@/components/ui/Button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

interface DocumentPreviewProps {
  document: DocumentDTO | null;
  actions?: ReactNode;
}

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const resolveFileUrl = (fileUrl?: string | null) => {
  if (!fileUrl) {
    return null;
  }
  if (fileUrl.startsWith("http")) {
    return fileUrl;
  }
  return `${baseUrl}${fileUrl}`;
};

const DocumentPreview = ({ document, actions }: DocumentPreviewProps) => {
  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [activeTab, setActiveTab] = useState<"preview" | "fields" | "ocr" | "notes">(
    "preview"
  );

  const fileUrl = useMemo(() => resolveFileUrl(document?.fileUrl), [document?.fileUrl]);
  const isPdf = document?.mimeType === "application/pdf";
  const fields = useMemo(() => {
    const data = document?.extractData;
    if (!data || typeof data !== "object") {
      return [];
    }
    const rawFields = (data as { fields?: Array<Record<string, unknown>> }).fields ?? [];
    return rawFields
      .map((field) => ({
        key: String(field.key ?? ""),
        value:
          field.valueText ??
          field.valueNumber ??
          field.valueDate ??
          field.value ??
          "",
      }))
      .filter((field) => field.key && field.value);
  }, [document?.extractData]);
  const notes = (document as (DocumentDTO & { notes?: string | null }) | null)?.notes ?? null;

  useEffect(() => {
    setActiveTab("preview");
  }, [document?.id]);

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
  const statusLabel = document.status ?? "Processing";
  const tabOptions: Array<{ id: "preview" | "fields" | "ocr" | "notes"; label: string }> = [
    { id: "preview", label: "Preview" },
    { id: "fields", label: "Extracted fields" },
    { id: "ocr", label: "OCR" },
  ];

  if (notes) {
    tabOptions.push({ id: "notes", label: "Notes" });
  }

  return (
    <div className="space-y-4 rounded-[32px] border border-zinc-200/70 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Document</p>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">
            {statusLabel} · {createdAtLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabOptions.map((tab) => (
          <button
            key={tab.id}
            className={
              activeTab === tab.id
                ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                : "rounded-full border border-zinc-200/70 bg-white px-3 py-1 text-xs text-slate-500"
            }
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "preview" ? (
        <div className="rounded-[28px] border border-zinc-200/70 bg-white p-4 shadow-sm">
          {fileUrl ? (
            isPdf ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">PDF preview</p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pageNumber <= 1}
                      onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-xs text-slate-500">
                      Page {pageNumber} of {numPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pageNumber >= numPages}
                      onClick={() => setPageNumber((prev) => Math.min(numPages, prev + 1))}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Document
                    file={fileUrl}
                    onLoadSuccess={(info) => {
                      setNumPages(info.numPages);
                      setPageNumber(1);
                    }}
                  >
                    <Page pageNumber={pageNumber} width={520} />
                  </Document>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <img
                  src={fileUrl}
                  alt={document.title ?? document.fileName ?? "Document preview"}
                  className="max-h-[520px] rounded-2xl object-contain"
                />
              </div>
            )
          ) : (
            <div className="flex h-[420px] items-center justify-center rounded-[28px] border border-dashed border-zinc-200/70 bg-zinc-50/70 text-sm text-slate-500">
              Preview unavailable.
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "fields" ? (
        <div className="rounded-[28px] border border-zinc-200/70 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Extracted fields</p>
          {fields.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No extracted fields yet.</p>
          ) : (
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              {fields.map((field) => (
                <div key={`${field.key}-${field.value}`} className="flex items-center justify-between">
                  <span>{field.key}</span>
                  <span className="text-slate-400">{String(field.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "ocr" ? (
        <div className="rounded-[28px] border border-zinc-200/70 bg-white p-5 text-sm text-slate-600 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">OCR text</p>
          <p className="mt-3 whitespace-pre-wrap text-xs text-slate-500">
            {document.rawText ?? "No OCR text available."}
          </p>
        </div>
      ) : null}

      {activeTab === "notes" ? (
        <div className="rounded-[28px] border border-zinc-200/70 bg-white p-5 text-sm text-slate-600 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Notes</p>
          <p className="mt-3 whitespace-pre-wrap text-xs text-slate-500">
            {notes ?? "No notes yet."}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default DocumentPreview;

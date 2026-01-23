import { useMemo, useState } from "react";
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

const DocumentPreview = ({ document }: DocumentPreviewProps) => {
  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);

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

  if (!document) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-[32px] border border-dashed border-zinc-200/70 bg-zinc-50/70 px-6 py-10 text-center">
        <FileText className="h-6 w-6 text-slate-400" />
        <p className="mt-2 text-sm font-medium text-slate-700">Select a document</p>
        <p className="text-xs text-slate-500">
          Choose a document from the list to see its preview and extracted fields.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-zinc-200/70 bg-white p-4 shadow-sm">
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

      <div className="rounded-[32px] border border-zinc-200/70 bg-white p-6 shadow-sm">
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

      <details className="rounded-[28px] border border-zinc-200/70 bg-white p-4 text-sm text-slate-600">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          OCR text
        </summary>
        <p className="mt-3 whitespace-pre-wrap text-xs text-slate-500">
          {document.rawText ?? "No OCR text available."}
        </p>
      </details>
    </div>
  );
};

export default DocumentPreview;

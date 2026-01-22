import { CalendarDays, FileText } from "lucide-react";
import clsx from "clsx";
import type { DocumentDTO } from "@/lib/api";

interface DocumentRowProps {
  document: DocumentDTO;
  onSelect: (document: DocumentDTO) => void;
}

const statusStyles: Record<string, string> = {
  READY: "bg-emerald-50 text-emerald-700",
  PROCESSING: "bg-amber-50 text-amber-700",
  NEEDS_REVIEW: "bg-rose-50 text-rose-700",
  ACTION_REQUIRED: "bg-rose-50 text-rose-700",
  UPLOADED: "bg-slate-100 text-slate-600",
};

const formatStatus = (status: string) =>
  status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const DocumentRow = ({ document, onSelect }: DocumentRowProps) => {
  const createdAt = new Date(document.createdAt).toLocaleDateString();
  const badgeClass = statusStyles[document.status] ?? "bg-slate-100 text-slate-600";
  const aiStatus = document.aiStatus ?? "PENDING";
  const categoryLabel = document.category?.name
    ? document.category.name
    : aiStatus === "PENDING" || aiStatus === "CATEGORIZING"
      ? "Categorizing…"
      : aiStatus === "FAILED"
        ? "Uncategorized"
        : undefined;

  return (
    <button
      className="flex w-full items-center justify-between gap-4 rounded-[28px] border border-zinc-200/70 bg-white px-4 py-4 text-left shadow-sm transition hover:border-zinc-300"
      onClick={() => onSelect(document)}
      type="button"
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">
            {document.title ?? document.fileName ?? "Untitled document"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className={clsx("rounded-full px-2 py-0.5 font-medium", badgeClass)}>
            {formatStatus(document.status)}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {createdAt}
          </span>
          {categoryLabel ? (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5">{categoryLabel}</span>
          ) : null}
        </div>
      </div>
      <span className="text-xs font-semibold text-slate-400">Open</span>
    </button>
  );
};

export default DocumentRow;

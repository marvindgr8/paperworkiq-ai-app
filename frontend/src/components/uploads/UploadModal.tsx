import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import Button from "@/components/ui/Button";
import { uploadDocument } from "@/lib/api";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded?: () => Promise<void> | void;
}

const UploadModal = ({ open, onClose, onUploaded }: UploadModalProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const helperCopy = useMemo(() => {
    if (files.length === 0) {
      return "Add a PDF, scan, or photo. We'll prepare it for answers with citations.";
    }
    return `${files.length} file${files.length === 1 ? "" : "s"} ready to upload.`;
  }, [files.length]);

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Select at least one file to upload.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const results = await Promise.all(files.map((file) => uploadDocument(file)));

      const successCount = results.filter((result) => result.ok).length;
      if (successCount === 0) {
        throw new Error(results[0]?.error ?? "Unable to upload documents.");
      }

      if (onUploaded) {
        await onUploaded();
      }
      onClose();
    } catch (uploadError) {
      setError((uploadError as Error).message ?? "Unable to upload documents.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        type="button"
      />
      <div className="relative w-full max-w-lg rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-2xl">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Upload documents
          </p>
          <h2 className="text-xl font-semibold text-slate-900">Bring your documents in</h2>
          <p className="text-sm text-slate-500">
            PaperworkIQ only answers with citations from your uploaded documents.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <label
            className={clsx(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[24px] border border-dashed border-zinc-200/80 bg-zinc-50/70 px-6 py-8 text-center text-sm text-slate-500",
              files.length > 0 && "border-slate-200 bg-white"
            )}
          >
            <input
              className="hidden"
              type="file"
              multiple
              accept="application/pdf,image/*"
              onChange={(event) => {
                const nextFiles = Array.from(event.target.files ?? []);
                setFiles(nextFiles);
                setError(null);
              }}
            />
            <span className="text-sm font-medium text-slate-700">Choose files</span>
            <span className="text-xs text-slate-400">PDFs, scans, or photos</span>
          </label>

          <p className="text-xs text-slate-500">{helperCopy}</p>

          {error ? <p className="text-xs font-medium text-rose-500">{error}</p> : null}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isSubmitting}>
              {isSubmitting ? "Uploading…" : "Upload"}
            </Button>
          </div>
          <p className="text-[11px] text-slate-400">
            Uploads start OCR and AI extraction immediately after ingest.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;

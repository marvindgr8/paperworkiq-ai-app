import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import { listDocuments, type DocumentDTO } from "@/lib/api";
import UploadFirstEmptyState from "@/components/uploads/UploadFirstEmptyState";
import { useAppGate } from "@/hooks/useAppGate";

const ActionsPage = () => {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const { docCount, isLoading } = useAppGate();
  const uploadFirst = !isLoading && docCount === 0;

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await listDocuments();
        if (response.ok) {
          setDocuments(response.docs ?? []);
        }
      } catch (error) {
        setDocuments([]);
      }
    };

    if (isLoading) {
      return;
    }
    if (docCount === 0) {
      setDocuments([]);
      return;
    }
    void fetchDocs();
  }, [docCount, isLoading]);

  const actionDocs = useMemo(() => {
    return documents.filter((doc) =>
      ["NEEDS_REVIEW", "ACTION_REQUIRED"].some((status) => doc.status.includes(status))
    );
  }, [documents]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200/70 bg-white/80 px-6 py-5">
        <h1 className="text-lg font-semibold text-slate-900">Actions</h1>
        <p className="text-xs text-slate-500">Documents that need your attention.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-4">
          {uploadFirst ? (
            <UploadFirstEmptyState
              title="No actions without documents"
              description="Upload a document and we’ll highlight any deadlines or urgent items."
              actionLabel="Upload a document"
            />
          ) : actionDocs.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-zinc-200/70 bg-zinc-50/70 px-6 py-10 text-center text-sm text-slate-500">
              Nothing urgent right now. We’ll surface action items as they appear.
            </div>
          ) : (
            actionDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-[28px] border border-zinc-200/70 bg-white px-4 py-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {doc.title ?? doc.fileName ?? "Untitled document"}
                  </p>
                  <p className="text-xs text-slate-500">Status: {doc.status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  <Button size="sm" variant="outline">
                    Review
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ActionsPage;

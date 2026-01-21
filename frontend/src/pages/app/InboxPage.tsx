import { useEffect, useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import { listDocuments, type DocumentDTO } from "@/lib/api";
import Button from "@/components/ui/Button";

const filters = ["All", "Bills", "Council", "Health", "Bank"];

const InboxPage = () => {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedDoc, setSelectedDoc] = useState<DocumentDTO | null>(null);

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

    void fetchDocs();
  }, []);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const title = (doc.title ?? doc.fileName ?? "Untitled").toLowerCase();
      const matchesQuery = title.includes(query.toLowerCase());
      if (activeFilter === "All") {
        return matchesQuery;
      }
      return matchesQuery && title.includes(activeFilter.toLowerCase());
    });
  }, [documents, query, activeFilter]);

  return (
    <div className="flex h-full">
      <div className="flex h-full flex-1 flex-col border-r border-zinc-200/70">
        <div className="border-b border-zinc-200/70 bg-white/80 px-6 py-5">
          <h1 className="text-lg font-semibold text-slate-900">Inbox</h1>
          <p className="text-xs text-slate-500">Every document you’ve uploaded, in one place.</p>
        </div>

        <div className="flex flex-col gap-4 px-6 py-4">
          <div className="flex items-center gap-2 rounded-2xl border border-zinc-200/70 bg-white px-3 py-2 text-sm text-slate-500">
            <Search className="h-4 w-4" />
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              placeholder="Search documents"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                className={
                  activeFilter === filter
                    ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                    : "rounded-full border border-zinc-200/70 bg-white px-3 py-1 text-xs text-slate-500"
                }
                onClick={() => setActiveFilter(filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-3">
            {filteredDocs.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-zinc-200/70 bg-zinc-50/70 px-6 py-10 text-center text-sm text-slate-500">
                No documents yet. Upload your first letter to get started.
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <button
                  key={doc.id}
                  className="flex w-full items-center justify-between rounded-[28px] border border-zinc-200/70 bg-white px-4 py-4 text-left shadow-sm"
                  onClick={() => setSelectedDoc(doc)}
                  type="button"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {doc.title ?? doc.fileName ?? "Untitled document"}
                    </p>
                    <p className="text-xs text-slate-500">Status: {doc.status}</p>
                  </div>
                  <FileText className="h-5 w-5 text-slate-400" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="hidden w-80 flex-col bg-white/80 px-6 py-6 lg:flex">
        <h2 className="text-sm font-semibold text-slate-900">Document detail</h2>
        {selectedDoc ? (
          <div className="mt-4 space-y-4 text-sm text-slate-600">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Title</p>
              <p className="font-medium text-slate-900">
                {selectedDoc.title ?? selectedDoc.fileName ?? "Untitled document"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
              <p>{selectedDoc.status}</p>
            </div>
            <div className="rounded-2xl border border-dashed border-zinc-200/70 bg-zinc-50 px-4 py-6 text-center text-xs text-slate-400">
              Document detail panel placeholder
            </div>
            <Button variant="outline">Open full detail</Button>
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-400">Select a document to see details.</p>
        )}
      </div>
    </div>
  );
};

export default InboxPage;

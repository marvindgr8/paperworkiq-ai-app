import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listDocuments, type DocumentDTO } from "@/lib/api";
import UploadPanel from "@/components/documents/UploadPanel";
import DocumentList from "@/components/documents/DocumentList";
import UploadFirstEmptyState from "@/components/uploads/UploadFirstEmptyState";
import { useAppGate } from "@/hooks/useAppGate";
import { useDocumentSelection } from "@/hooks/useDocumentSelection";

const filters = ["All", "Bills", "Council", "Health", "Bank", "Housing"];

const categoryMatchers: Record<string, string[]> = {
  Bills: ["bill", "invoice"],
  Council: ["council"],
  Health: ["health", "nhs"],
  Bank: ["bank", "statement"],
  Housing: ["rent", "housing"],
};

const inferCategory = (doc: DocumentDTO) => {
  const title = (doc.title ?? doc.fileName ?? "").toLowerCase();
  const match = Object.entries(categoryMatchers).find(([, keywords]) =>
    keywords.some((keyword) => title.includes(keyword))
  );
  return match?.[0];
};

const InboxHomePage = () => {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [isFetching, setIsFetching] = useState(false);
  const { docCount, isLoading, uploadSignal } = useAppGate();
  const { setSelectedDocument } = useDocumentSelection();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const lastUploadSignal = useRef(0);
  const uploadFirst = !isLoading && docCount === 0;

  useEffect(() => {
    const category = searchParams.get("category");
    if (category && filters.includes(category)) {
      setActiveFilter(category);
    } else if (!category) {
      setActiveFilter("All");
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchDocs = async () => {
      setIsFetching(true);
      try {
        const response = await listDocuments();
        if (response.ok) {
          setDocuments(response.docs ?? []);
        } else {
          setDocuments([]);
        }
      } catch (error) {
        setDocuments([]);
      } finally {
        setIsFetching(false);
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
  }, [docCount, isLoading, uploadSignal]);

  useEffect(() => {
    if (uploadSignal > lastUploadSignal.current && documents.length > 0) {
      lastUploadSignal.current = uploadSignal;
      navigate(`/app/doc/${documents[0].id}`);
    }
  }, [documents, navigate, uploadSignal]);

  useEffect(() => {
    if (uploadFirst) {
      setSelectedDocument(null);
    }
  }, [setSelectedDocument, uploadFirst]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const title = (doc.title ?? doc.fileName ?? "Untitled").toLowerCase();
      const matchesQuery = title.includes(query.toLowerCase());
      if (!matchesQuery) {
        return false;
      }
      if (activeFilter === "All") {
        return true;
      }
      if (activeFilter === "Bills") {
        return categoryMatchers.Bills.some((keyword) => title.includes(keyword));
      }
      return title.includes(activeFilter.toLowerCase());
    });
  }, [documents, query, activeFilter]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    if (filter === "All") {
      setSearchParams((params) => {
        params.delete("category");
        return params;
      });
      return;
    }
    setSearchParams((params) => {
      params.set("category", filter);
      return params;
    });
  };

  const handleSelectDocument = (doc: DocumentDTO) => {
    setSelectedDocument(doc);
    navigate(`/app/doc/${doc.id}`);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200/70 bg-white/80 px-6 py-5">
        <h1 className="text-lg font-semibold text-slate-900">Inbox</h1>
        <p className="text-xs text-slate-500">
          Upload new paperwork and keep track of everything in one place.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-8">
          <UploadPanel />

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Recent documents</h2>
                <p className="text-xs text-slate-500">
                  Open any document to ask questions and see citations.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200/70 bg-white px-3 py-2 text-sm text-slate-500">
                <Search className="h-4 w-4" />
                <input
                  className="flex-1 bg-transparent text-sm outline-none"
                  placeholder="Search documents"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
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
                  onClick={() => handleFilterChange(filter)}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {uploadFirst ? (
            <UploadFirstEmptyState
              title="Upload your first document"
              description="Add a letter or bill to start tracking what needs attention."
            />
          ) : filteredDocs.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-zinc-200/70 bg-zinc-50/70 px-6 py-10 text-center text-sm text-slate-500">
              {isFetching ? "Loading documents…" : "No matching documents yet."}
            </div>
          ) : (
            <DocumentList
              documents={filteredDocs}
              getCategory={inferCategory}
              onSelect={handleSelectDocument}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxHomePage;

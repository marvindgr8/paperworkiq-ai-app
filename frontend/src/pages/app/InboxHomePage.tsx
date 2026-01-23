import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listCategories, listDocuments, type CategoryDTO, type DocumentDTO } from "@/lib/api";
import UploadPanel from "@/components/documents/UploadPanel";
import DocumentList from "@/components/documents/DocumentList";
import UploadFirstEmptyState from "@/components/uploads/UploadFirstEmptyState";
import { useAppGate } from "@/hooks/useAppGate";
import { useDocumentSelection } from "@/hooks/useDocumentSelection";

const InboxHomePage = () => {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const { docCount, isLoading, uploadSignal } = useAppGate();
  const { setSelectedDocument } = useDocumentSelection();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const lastUploadSignal = useRef(0);
  const uploadFirst = !isLoading && docCount === 0;

  useEffect(() => {
    const categoryId = searchParams.get("categoryId");
    setActiveCategoryId(categoryId);
  }, [searchParams]);

  useEffect(() => {
    const fetchDocs = async () => {
      setIsFetching(true);
      try {
        const response = await listDocuments({
          categoryId: activeCategoryId ?? undefined,
        });
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
  }, [activeCategoryId, docCount, isLoading, uploadSignal]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await listCategories();
        if (response.ok) {
          setCategories(response.categories ?? []);
        } else {
          setCategories([]);
        }
      } catch (error) {
        setCategories([]);
      }
    };

    if (isLoading) {
      return;
    }
    if (docCount === 0) {
      setCategories([]);
      return;
    }
    void fetchCategories();
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
      return matchesQuery;
    });
  }, [documents, query]);

  const handleFilterChange = (categoryId: string | null) => {
    setActiveCategoryId(categoryId);
    if (!categoryId) {
      setSearchParams((params) => {
        params.delete("categoryId");
        return params;
      });
      return;
    }
    setSearchParams((params) => {
      params.set("categoryId", categoryId);
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
        <h1 className="text-lg font-semibold text-slate-900">Home</h1>
        <p className="text-xs text-slate-500">
          Upload documents to keep everything organized and ready for AI answers.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {uploadFirst ? (
          <div className="space-y-6">
            <UploadPanel />
            <UploadFirstEmptyState
              title="Upload your first document to get started."
              description="Add a document to unlock summaries, categories, and grounded answers."
            />
          </div>
        ) : (
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

              {categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    className={
                      !activeCategoryId
                        ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                        : "rounded-full border border-zinc-200/70 bg-white px-3 py-1 text-xs text-slate-500"
                    }
                    onClick={() => handleFilterChange(null)}
                    type="button"
                  >
                    All
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      className={
                        activeCategoryId === category.id
                          ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                          : "rounded-full border border-zinc-200/70 bg-white px-3 py-1 text-xs text-slate-500"
                      }
                      onClick={() => handleFilterChange(category.id)}
                      type="button"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {filteredDocs.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-zinc-200/70 bg-zinc-50/70 px-6 py-10 text-center text-sm text-slate-500">
                {isFetching ? "Loading documents…" : "No matching documents yet."}
              </div>
            ) : (
              <DocumentList documents={filteredDocs} onSelect={handleSelectDocument} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxHomePage;

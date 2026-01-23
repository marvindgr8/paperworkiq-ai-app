import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getDocument,
  listCategories,
  listDocuments,
  type CategoryDTO,
  type DocumentDTO,
} from "@/lib/api";
import UploadPanel from "@/components/documents/UploadPanel";
import DocumentList from "@/components/documents/DocumentList";
import UploadFirstEmptyState from "@/components/uploads/UploadFirstEmptyState";
import { useAppGate } from "@/hooks/useAppGate";
import { useDocumentSelection } from "@/hooks/useDocumentSelection";
import DocumentPreview from "@/components/documents/DocumentPreview";
import AppHeader from "@/components/app/AppHeader";
import Button from "@/components/ui/Button";

const HomePage = () => {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentDTO | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const { docCount, isLoading, uploadSignal, openUpload } = useAppGate();
  const { setSelectedDocument } = useDocumentSelection();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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
    if (uploadFirst) {
      setSelectedDocument(null);
      setSelectedDocumentId(null);
      setPreviewDoc(null);
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

  useEffect(() => {
    if (selectedDocumentId && !documents.some((doc) => doc.id === selectedDocumentId)) {
      setSelectedDocumentId(null);
      setSelectedDocument(null);
      setPreviewDoc(null);
    }
  }, [documents, selectedDocumentId, setSelectedDocument]);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!selectedDocumentId) {
        setPreviewDoc(null);
        return;
      }
      setIsPreviewLoading(true);
      try {
        const response = await getDocument(selectedDocumentId);
        if (response.ok) {
          setPreviewDoc(response.doc ?? null);
        } else {
          setPreviewDoc(null);
        }
      } catch (error) {
        setPreviewDoc(null);
      } finally {
        setIsPreviewLoading(false);
      }
    };

    void fetchPreview();
  }, [selectedDocumentId]);

  const handleSelectDocument = (doc: DocumentDTO) => {
    setSelectedDocumentId(doc.id);
    setSelectedDocument(doc);
  };

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="Home"
        subtitle="Upload documents to keep everything organized and ready for AI answers."
        actions={
          <Button size="sm" onClick={openUpload}>
            Upload
          </Button>
        }
      />

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
          <div className="flex flex-col gap-6 lg:flex-row">
            <div
              className={`flex w-full flex-col gap-6 lg:w-2/5 ${
                selectedDocumentId ? "hidden lg:flex" : "flex"
              }`}
            >
              {!selectedDocumentId ? <UploadPanel /> : null}

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Recent documents</h2>
                    <p className="text-xs text-slate-500">
                      Select any document to preview and review extracted fields.
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
                <DocumentList
                  documents={filteredDocs}
                  onSelect={handleSelectDocument}
                  onOpen={(doc) => navigate(`/app/doc/${doc.id}`)}
                />
              )}
            </div>

            <div className={`flex-1 ${selectedDocumentId ? "flex" : "hidden lg:flex"}`}>
              {selectedDocumentId ? (
                isPreviewLoading ? (
                  <div className="h-full w-full rounded-[32px] border border-dashed border-zinc-200/70 bg-zinc-50/70" />
                ) : (
                  <DocumentPreview
                    document={previewDoc}
                    actions={
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="lg:hidden"
                          onClick={() => {
                            setSelectedDocumentId(null);
                            setSelectedDocument(null);
                          }}
                        >
                          Back to list
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (selectedDocumentId) {
                              navigate(`/app/doc/${selectedDocumentId}`);
                            }
                          }}
                          className="h-auto items-start gap-1 px-4 py-2 text-left"
                        >
                          <span className="text-sm font-semibold">Ask about this document</span>
                        </Button>
                      </>
                    }
                  />
                )
              ) : (
                <div className="flex h-full items-center justify-center rounded-[32px] border border-dashed border-zinc-200/70 bg-zinc-50/70 px-6 py-10 text-center">
                  <div className="space-y-2 text-sm text-slate-500">
                    <p className="text-sm font-medium text-slate-700">
                      Select a document to preview
                    </p>
                    <p>Pick a document from the list to review details.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;

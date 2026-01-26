import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import {
  deleteDocument,
  downloadDocumentFile,
  getDocument,
  listCategories,
  listDocuments,
  reprocessDocument,
  searchDocuments,
  type CategoryDTO,
  type DocumentDTO,
} from "@/lib/api";
import UploadPanel from "@/components/documents/UploadPanel";
import DocumentList from "@/components/documents/DocumentList";
import UploadFirstEmptyState from "@/components/uploads/UploadFirstEmptyState";
import { useAppGate } from "@/hooks/useAppGate";
import { useDocumentSelection } from "@/hooks/useDocumentSelection";
import DocumentPreview from "@/components/documents/DocumentPreview";
import DocumentActionsMenu from "@/components/documents/DocumentActionsMenu";
import AppHeader from "@/components/app/AppHeader";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Toast from "@/components/ui/Toast";
import { useSidebarSearch } from "@/hooks/useSidebarSearch";

const HomePage = () => {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [searchResults, setSearchResults] = useState<DocumentDTO[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentDTO | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentDTO | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { docCount, isLoading, uploadSignal, openUpload } = useAppGate();
  const { setSelectedDocument } = useDocumentSelection();
  const { query, setQuery } = useSidebarSearch();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const listRef = useRef<HTMLDivElement>(null);
  const uploadFirst = !isLoading && docCount === 0;

  useEffect(() => {
    const categoryId = searchParams.get("categoryId");
    setActiveCategoryId(categoryId);
  }, [searchParams]);

  useEffect(() => {
    const urlQuery = searchParams.get("q") ?? "";
    setQuery(urlQuery);
  }, [searchParams, setQuery]);

  useEffect(() => {
    setSearchParams(
      (params) => {
        if (query) {
          params.set("q", query);
        } else {
          params.delete("q");
        }
        return params;
      },
      { replace: true }
    );
  }, [query, setSearchParams]);

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

  useEffect(() => {
    const state = location.state as { toast?: string } | null;
    const focusResults = state?.focusResults;
    if (state?.toast) {
      setToastMessage(state.toast);
    }
    if (focusResults) {
      window.requestAnimationFrame(() => {
        listRef.current?.focus();
      });
    }
    if (state?.toast || focusResults) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timer = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearchLoading(false);
      return;
    }

    let isActive = true;
    setIsSearchLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await searchDocuments({ query: trimmed, limit: 50 });
        if (!isActive) {
          return;
        }
        setSearchResults(response.ok ? (response.docs ?? []) : []);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setSearchResults([]);
      } finally {
        if (isActive) {
          setIsSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const filteredDocs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return documents;
    }
    return documents.filter((doc) => {
      const title = (doc.title ?? doc.fileName ?? "Untitled").toLowerCase();
      return title.includes(normalized);
    });
  }, [documents, query]);

  const displayedDocs = useMemo(() => {
    if (query.trim().length >= 2) {
      return searchResults;
    }
    return filteredDocs;
  }, [filteredDocs, query, searchResults]);

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

  const duplicateHashes = useMemo(() => {
    const counts = new Map<string, number>();
    documents.forEach((doc) => {
      if (doc.fileHash) {
        counts.set(doc.fileHash, (counts.get(doc.fileHash) ?? 0) + 1);
      }
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([hash]) => hash)
    );
  }, [documents]);

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      const response = await deleteDocument(deleteTarget.id);
      if (response.ok) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== deleteTarget.id));
        if (selectedDocumentId === deleteTarget.id) {
          setSelectedDocumentId(null);
          setSelectedDocument(null);
          setPreviewDoc(null);
        }
      }
    } finally {
      setDeleteTarget(null);
    }
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
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Recent documents</h2>
                    <p className="text-xs text-slate-500">
                      Select any document to preview and open the full view.
                    </p>
                  </div>
                  <div className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-zinc-200/70 bg-white px-3 py-2 text-sm text-slate-500">
                    <Search className="h-4 w-4" />
                    <input
                      className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                      placeholder="Search documents"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          listRef.current?.focus();
                        }
                        if (event.key === "Escape") {
                          setQuery("");
                        }
                      }}
                    />
                    {query ? (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="rounded-full p-1 text-slate-400 transition hover:bg-zinc-100 hover:text-slate-600"
                        aria-label="Clear search"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    ) : null}
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

              <div ref={listRef} tabIndex={-1} aria-label="Document results list">
                {displayedDocs.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-zinc-200/70 bg-zinc-50/70 px-6 py-10 text-center text-sm text-slate-500">
                    {isFetching || isSearchLoading
                      ? "Loading documents…"
                      : "No matching documents yet."}
                  </div>
                ) : (
                  <DocumentList
                    documents={displayedDocs}
                    onSelect={handleSelectDocument}
                    onOpen={(doc) => navigate(`/app/doc/${doc.id}`)}
                    onDelete={(doc) => setDeleteTarget(doc)}
                    onDownload={(doc) => {
                      void downloadDocumentFile(doc.id, doc.fileName ?? undefined);
                    }}
                    duplicateHashes={duplicateHashes}
                  />
                )}
              </div>
            </div>

            <div className={`flex-1 ${selectedDocumentId ? "flex" : "hidden lg:flex"}`}>
              {selectedDocumentId ? (
                isPreviewLoading ? (
                  <div className="h-full w-full rounded-[32px] border border-dashed border-zinc-200/70 bg-zinc-50/70" />
                ) : (
                  <DocumentPreview
                    document={previewDoc}
                    showTabs={false}
                    onRetryProcessing={
                      previewDoc
                        ? () => {
                            void reprocessDocument(previewDoc.id);
                          }
                        : undefined
                    }
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
                          <span className="text-sm font-semibold">Open document</span>
                        </Button>
                        {previewDoc ? (
                          <DocumentActionsMenu
                            onDelete={() => setDeleteTarget(previewDoc)}
                            onDownload={() => {
                              void downloadDocumentFile(
                                previewDoc.id,
                                previewDoc.fileName ?? undefined
                              );
                            }}
                            onReprocess={() => {
                              void reprocessDocument(previewDoc.id);
                            }}
                          />
                        ) : null}
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
                    <p>Pick a document from the list to preview it here.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this document?"
        description="This can’t be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      {toastMessage ? (
        <Toast
          message={toastMessage}
          onDismiss={() => {
            setToastMessage(null);
          }}
        />
      ) : null}
    </div>
  );
};

export default HomePage;

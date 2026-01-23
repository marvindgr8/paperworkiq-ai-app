import { useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, MessageCircle, Home, Plus, Search, X } from "lucide-react";
import clsx from "clsx";
import Button from "@/components/ui/Button";
import { useAppGate } from "@/hooks/useAppGate";
import WorkspaceMenu from "@/components/app/WorkspaceMenu";
import { useSidebarSearch } from "@/hooks/useSidebarSearch";
import { searchDocuments } from "@/lib/api";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    "flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-white text-slate-900 shadow-sm"
      : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
  );

interface AppSidebarProps {
  onNewChat?: () => void;
}

const statusStyles: Record<string, string> = {
  READY: "bg-emerald-50 text-emerald-700",
  PROCESSING: "bg-amber-50 text-amber-700",
  FAILED: "bg-rose-50 text-rose-700",
  NEEDS_REVIEW: "bg-rose-50 text-rose-700",
  ACTION_REQUIRED: "bg-rose-50 text-rose-700",
  UPLOADED: "bg-slate-100 text-slate-600",
};

const formatStatus = (status: string) =>
  status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const AppSidebar = ({ onNewChat }: AppSidebarProps) => {
  const { docCount, isLoading, openUpload } = useAppGate();
  const showHomeBadge = !isLoading;
  const {
    query,
    results,
    isOpen,
    isLoading: isSearching,
    setQuery,
    setResults,
    setIsOpen,
    setIsLoading,
    reset,
  } = useSidebarSearch();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/app/home";
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHome) {
      reset();
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      reset();
      return;
    }

    let isActive = true;
    setIsLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await searchDocuments({ query: trimmed, limit: 6 });
        if (!isActive) {
          return;
        }
        const docs = response.ok ? (response.docs ?? []) : [];
        setResults(docs);
        setIsOpen(docs.length > 0);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setResults([]);
        setIsOpen(false);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [isHome, query, reset, setIsLoading, setIsOpen, setResults]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) {
        return;
      }
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  const handleNavigateToHome = () => {
    const trimmed = query.trim();
    if (!trimmed) {
      navigate("/app/home", { state: { focusResults: true } });
      setIsOpen(false);
      return;
    }
    navigate(`/app/home?q=${encodeURIComponent(trimmed)}`, {
      state: { focusResults: true },
    });
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    reset();
  };

  return (
    <aside className="flex h-full w-72 flex-col gap-6 border-r border-zinc-200/70 bg-zinc-50/70 px-4 py-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <p className="text-xs tracking-[0.2em] text-slate-400">PaperworkIQ</p>
          <p className="text-lg font-semibold text-slate-900">Your assistant</p>
        </div>
      </div>

      <div className="space-y-3">
        <Button className="w-full justify-center rounded-2xl" size="lg" onClick={openUpload}>
          <Plus className="mr-2 h-4 w-4" />
          Upload
        </Button>
        {onNewChat ? (
          <Button
            className="w-full justify-center rounded-2xl"
            size="sm"
            variant="outline"
            onClick={onNewChat}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            New chat
          </Button>
        ) : null}
        <div className="relative" ref={containerRef}>
          <div className="flex items-center gap-2 rounded-2xl border border-zinc-200/70 bg-white px-3 py-2 text-sm text-slate-500">
            <Search className="h-4 w-4" />
            <input
              className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="Search documents"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleNavigateToHome();
                }
                if (event.key === "Escape") {
                  setIsOpen(false);
                }
              }}
            />
            {query ? (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-full p-1 text-slate-400 transition hover:bg-zinc-100 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>
          {!isHome && isOpen ? (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-zinc-200/70 bg-white p-2 shadow-sm">
              <div className="flex flex-col gap-2">
                {results.map((doc) => {
                  const createdAt = new Date(doc.createdAt).toLocaleDateString();
                  const badgeClass = statusStyles[doc.status] ?? "bg-slate-100 text-slate-600";
                  const categoryLabel = doc.category?.name ?? doc.categoryLabel ?? undefined;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      className="flex w-full items-start justify-between gap-3 rounded-2xl border border-transparent px-3 py-2 text-left text-sm transition hover:border-zinc-200 hover:bg-zinc-50"
                      onClick={() => {
                        setIsOpen(false);
                        navigate(`/app/doc/${doc.id}`);
                      }}
                    >
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {doc.title ?? doc.fileName ?? "Untitled document"}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className={clsx("rounded-full px-2 py-0.5 font-medium", badgeClass)}>
                            {formatStatus(doc.status)}
                          </span>
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                            {createdAt}
                          </span>
                          {categoryLabel ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                              {categoryLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {results.length === 0 && !isSearching ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200/70 px-3 py-3 text-xs text-slate-500">
                    No matching documents.
                  </div>
                ) : null}
                {isSearching ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200/70 px-3 py-3 text-xs text-slate-500">
                    Searching documents…
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="space-y-2">
        <NavLink className={navItemClass} to="/app/home">
          <span className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Home
          </span>
          {showHomeBadge ? (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
              {docCount}
            </span>
          ) : null}
        </NavLink>
        <NavLink className={navItemClass} to="/app/actions">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Actions
          </span>
        </NavLink>
        <NavLink className={navItemClass} to="/app/chat">
          <span className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </span>
        </NavLink>
      </nav>

      <div className="mt-auto space-y-2">
        <WorkspaceMenu />
      </div>
    </aside>
  );
};

export default AppSidebar;

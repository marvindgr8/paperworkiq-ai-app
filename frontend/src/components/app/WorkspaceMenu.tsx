import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutGrid, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { signOut } from "@/lib/auth";

const WorkspaceMenu = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // TODO: Replace with real workspace data when available.
  const workspaceName = "Personal";
  const workspaceSubtitle = "Personal workspace";

  useEffect(() => {
    if (!isOpen) {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSettings = () => {
    setIsOpen(false);
    navigate("/app/settings");
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    navigate("/");
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-transparent bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Workspace menu"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200/70 bg-white text-slate-500 shadow-sm">
            <LayoutGrid className="h-4 w-4" />
          </span>
          <span className="flex flex-col text-left">
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Workspace
            </span>
            <span className="text-sm font-medium text-slate-700">{workspaceName}</span>
          </span>
        </span>
        <ChevronDown
          className={clsx(
            "h-4 w-4 text-slate-500 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 right-0 bottom-full z-30 mb-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_14px_28px_rgba(15,23,42,0.12)]"
          role="menu"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-slate-900">{workspaceName}</p>
            <p className="text-xs text-slate-500">{workspaceSubtitle}</p>
          </div>
          <div className="my-2 h-px bg-zinc-100" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            onClick={handleSettings}
          >
            <Settings className="h-4 w-4 text-slate-500" />
            Settings
          </button>
          <div className="my-2 h-px bg-zinc-100" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 text-rose-500" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default WorkspaceMenu;

import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  FolderOpen,
  LayoutGrid,
  MessageCircle,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import clsx from "clsx";
import Button from "@/components/ui/Button";
import { useAppGate } from "@/hooks/useAppGate";

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

const AppSidebar = ({ onNewChat }: AppSidebarProps) => {
  const { docCount, isLoading, openUpload } = useAppGate();
  const location = useLocation();
  const navigate = useNavigate();
  const showInboxBadge = !isLoading;
  const activeCategory = new URLSearchParams(location.search).get("category") ?? "All";
  const categories = ["All", "Council", "Health", "Energy", "Bank", "Housing"];
  return (
    <aside className="flex h-full w-72 flex-col gap-6 border-r border-zinc-200/70 bg-zinc-50/70 px-4 py-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">PaperworkIQ</p>
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
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-200/70 bg-white px-3 py-2 text-sm text-slate-500">
          <Search className="h-4 w-4" />
          <span>Search letters</span>
        </div>
      </div>

      <nav className="space-y-2">
        <NavLink className={navItemClass} to="/app">
          <span className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Inbox
          </span>
          {showInboxBadge ? (
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
        <NavLink className={navItemClass} to="/app/overview">
          <span className="flex items-center gap-2">
            Overview
          </span>
        </NavLink>
      </nav>

      <div className="space-y-2">
        <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Categories
        </p>
        <div className="space-y-2">
          {categories.map((item) => (
            <button
              key={item}
              className={clsx(
                "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition",
                activeCategory === item
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
              )}
              onClick={() =>
                item === "All"
                  ? navigate("/app")
                  : navigate(`/app?category=${encodeURIComponent(item)}`)
              }
              type="button"
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                {item === "All" ? "All documents" : item}
              </span>
              <span className="text-xs text-slate-400">·</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-2">
        <NavLink className={navItemClass} to="/app/settings">
          <span className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </span>
        </NavLink>
        <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-slate-600">
          <LayoutGrid className="h-4 w-4" />
          Workspace · Personal
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;

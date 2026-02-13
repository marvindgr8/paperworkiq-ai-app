import { NavLink } from "react-router-dom";
import { Bell, Home, Plus } from "lucide-react";
import clsx from "clsx";
import Button from "@/components/ui/Button";
import { useAppGate } from "@/hooks/useAppGate";
import WorkspaceMenu from "@/components/app/WorkspaceMenu";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    "flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-white text-slate-900 shadow-sm"
      : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
  );

const AppSidebar = () => {
  const { openUpload } = useAppGate();
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
      </div>

      <nav className="space-y-2">
        <NavLink className={navItemClass} to="/app/home">
          <span className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Home
          </span>
        </NavLink>
        <NavLink className={navItemClass} to="/app/actions">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Actions
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

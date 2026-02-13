import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { Bell, FolderPlus, Home, Plus, Upload } from "lucide-react";
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
  const { openNewFolder, uploadFilesFromSidebar } = useAppGate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <aside className="flex h-full w-72 flex-col gap-6 border-r border-zinc-200/70 bg-zinc-50/70 px-4 py-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <p className="text-xs tracking-[0.2em] text-slate-400">PaperworkIQ</p>
          <p className="text-lg font-semibold text-slate-900">Your assistant</p>
        </div>
      </div>

      <div className="relative">
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept="application/pdf,image/*"
          multiple
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length === 0) {
              return;
            }
            await uploadFilesFromSidebar(files);
            event.target.value = "";
          }}
        />
        <Button
          ref={buttonRef}
          className="w-full justify-center rounded-2xl"
          size="lg"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New
        </Button>

        {isOpen ? (
          <div
            ref={menuRef}
            role="menu"
            className="absolute left-0 top-full z-20 mt-2 w-56 rounded-lg border bg-white p-1 shadow-lg"
          >
            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              onClick={() => {
                setIsOpen(false);
                openNewFolder();
              }}
            >
              <span className="flex items-center gap-3">
                <FolderPlus className="h-4 w-4 text-gray-500" />
                <span>New folder</span>
              </span>
            </button>
            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              onClick={() => {
                setIsOpen(false);
                fileInputRef.current?.click();
              }}
            >
              <span className="flex items-center gap-3">
                <Upload className="h-4 w-4 text-gray-500" />
                <span>File upload</span>
              </span>
            </button>
          </div>
        ) : null}
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

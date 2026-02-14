import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { Bell, FolderPlus, FolderUp, Home, Plus, Upload } from "lucide-react";
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
  const { openNewFolder, uploadFilesFromSidebar, uploadFolderFromSidebar } = useAppGate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [uploadingType, setUploadingType] = useState<"file" | "folder" | null>(null);
  const isUploading = uploadingType !== null;

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
          accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          multiple
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length === 0) {
              return;
            }
            setUploadingType("file");
            try {
              await uploadFilesFromSidebar(files);
            } finally {
              setUploadingType(null);
              event.target.value = "";
            }
          }}
        />
        <input
          ref={folderInputRef}
          className="hidden"
          type="file"
          // Non-standard but widely supported. This enables Drive-style folder picking.
          // Browsers return only files, so empty directories are not represented.
          webkitdirectory=""
          directory=""
          multiple
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length === 0) {
              return;
            }
            setUploadingType("folder");
            try {
              await uploadFolderFromSidebar(files);
            } finally {
              setUploadingType(null);
              event.target.value = "";
            }
          }}
        />
        <Button
          ref={buttonRef}
          className="w-full justify-center rounded-2xl"
          size="lg"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          disabled={isUploading}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <Plus className="mr-2 h-4 w-4" />
          {uploadingType === "folder" ? "Uploading folder…" : null}
          {uploadingType === "file" ? "Uploading files…" : null}
          {!uploadingType ? "New" : null}
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
              disabled={isUploading}
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
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
            <button
              type="button"
              disabled={isUploading}
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                setIsOpen(false);
                folderInputRef.current?.click();
              }}
            >
              <span className="flex items-center gap-3">
                <FolderUp className="h-4 w-4 text-gray-500" />
                <span>Folder upload</span>
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

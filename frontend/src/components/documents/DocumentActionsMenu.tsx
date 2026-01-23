import { useEffect, useRef, useState } from "react";
import { Download, MoreHorizontal, RefreshCcw, Trash2 } from "lucide-react";

interface DocumentActionsMenuProps {
  onDelete?: () => void;
  onDownload?: () => void;
  onReprocess?: () => void;
}

const DocumentActionsMenu = ({
  onDelete,
  onDownload,
  onReprocess,
}: DocumentActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isOpen && containerRef.current && !containerRef.current.contains(target)) {
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="flex items-center gap-1 rounded-full border border-zinc-200/70 bg-white px-2 py-1 text-xs text-slate-500 shadow-sm transition hover:text-slate-700"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 z-30 mt-2 w-40 rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_14px_28px_rgba(15,23,42,0.12)]"
          role="menu"
        >
          {onReprocess ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-zinc-50"
              onClick={(event) => {
                event.stopPropagation();
                setIsOpen(false);
                onReprocess?.();
              }}
            >
              <RefreshCcw className="h-4 w-4 text-slate-500" />
              Reprocess
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-zinc-50"
            onClick={(event) => {
              event.stopPropagation();
              setIsOpen(false);
              onDownload?.();
            }}
          >
            <Download className="h-4 w-4 text-slate-500" />
            Download
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
            onClick={(event) => {
              event.stopPropagation();
              setIsOpen(false);
              onDelete?.();
            }}
          >
            <Trash2 className="h-4 w-4 text-rose-500" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default DocumentActionsMenu;

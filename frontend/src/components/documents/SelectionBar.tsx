import { Move, Pencil, Trash2, X } from "lucide-react";

interface SelectionBarProps {
  selectedCount: number;
  renameDisabled: boolean;
  onClearSelection: () => void;
  onMove: () => void;
  onRename: () => void;
  onDelete: () => void;
}

const baseIconButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-slate-600 transition hover:bg-white hover:text-slate-900";

const SelectionBar = ({
  selectedCount,
  renameDisabled,
  onClearSelection,
  onMove,
  onRename,
  onDelete,
}: SelectionBarProps) => (
  <div className="mb-4 flex items-center justify-between rounded-lg border bg-gray-100 px-4 py-2">
    <div className="flex items-center gap-3">
      <button type="button" className={baseIconButtonClass} onClick={onClearSelection} aria-label="Clear selection">
        <X className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium">{selectedCount} selected</span>
    </div>
    <div className="flex items-center gap-3">
      <button type="button" className={baseIconButtonClass} onClick={onMove} aria-label="Move selected items">
        <Move className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={`${baseIconButtonClass} ${renameDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={onRename}
        disabled={renameDisabled}
        aria-label="Rename selected item"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button type="button" className={baseIconButtonClass} onClick={onDelete} aria-label="Delete selected items">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  </div>
);

export default SelectionBar;

import { useMemo, useState, type MouseEvent } from "react";
import { Check, FileText, Folder as FolderIcon, ImageIcon, MoreHorizontal } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export interface DriveItem {
  id: string;
  name: string;
  kind: "folder" | "file";
  mimeType?: string | null;
  updatedAt?: string;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface DriveBrowserProps {
  breadcrumbs: BreadcrumbItem[];
  items: DriveItem[];
  selectedIds: string[];
  loading?: boolean;
  onNavigate: (folderId: string | null) => void;
  onSelect: (item: DriveItem, event: MouseEvent<HTMLDivElement>) => void;
  onOpen: (item: DriveItem) => void;
  onRename: (item: DriveItem) => void;
  onMove: (item: DriveItem) => void;
  onDownload: (item: DriveItem) => void;
  onDelete: (item: DriveItem) => void;
  onShare: (item: DriveItem) => void;
  onClearSelection: () => void;
}

const formatDate = (value?: string) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "—";
  }
  return date.toLocaleDateString();
};

const getTypeLabel = (item: DriveItem) => {
  if (item.kind === "folder") {
    return "Folder";
  }
  if (item.mimeType) {
    return item.mimeType;
  }
  const nameParts = item.name.split(".");
  return nameParts.length > 1 ? `${nameParts.at(-1)?.toUpperCase()} file` : "File";
};

const getIcon = (item: DriveItem) => {
  if (item.kind === "folder") {
    return <FolderIcon className="h-4 w-4 text-amber-500" />;
  }
  if (item.mimeType?.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4 text-sky-500" />;
  }
  return <FileText className="h-4 w-4 text-slate-500" />;
};

const DriveBrowser = ({
  breadcrumbs,
  items,
  selectedIds,
  loading,
  onNavigate,
  onSelect,
  onOpen,
  onRename,
  onMove,
  onDownload,
  onDelete,
  onShare,
  onClearSelection,
}: DriveBrowserProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id ?? "root"} className="flex items-center gap-2">
            {index > 0 ? <span>/</span> : null}
            <button
              type="button"
              onClick={() => onNavigate(crumb.id)}
              className="font-medium text-slate-700 hover:text-slate-900"
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      <Input
        value={searchQuery}
        placeholder="Search in folder"
        onChange={(event) => setSearchQuery(event.target.value)}
      />

      <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white" onClick={onClearSelection}>
        <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_120px_56px] border-b border-zinc-200/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Name</span>
          <span>Type</span>
          <span>Modified</span>
          <span />
        </div>
        <div className="space-y-1 p-2">
          {loading ? <p className="px-4 py-8 text-sm text-slate-500">Loading items…</p> : null}
          {!loading && filteredItems.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500">No files yet. Upload or create a folder.</p>
          ) : null}
          {!loading
            ? filteredItems.map((item) => {
                const isSelected = selectedIdSet.has(item.id);
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(item, event);
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      onOpen(item);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        onOpen(item);
                      }
                    }}
                    className={`grid select-none grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_120px_56px] items-center rounded-lg p-3 text-sm transition ${
                      isSelected ? "border border-blue-400 bg-blue-50" : "border border-transparent hover:bg-gray-50"
                    }`}
                  >
                    <div className={`flex items-center gap-2 text-left ${isSelected ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                      {isSelected ? <Check className="h-4 w-4 text-blue-600" /> : null}
                      {getIcon(item)}
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="truncate text-slate-500">{getTypeLabel(item)}</span>
                    <span className="text-xs text-slate-500">{formatDate(item.updatedAt)}</span>
                    <div className="relative flex justify-end" onClick={(event) => event.stopPropagation()}>
                      <details>
                        <summary className="list-none">
                          <span className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-zinc-200 text-slate-500 hover:bg-zinc-50">
                            <MoreHorizontal className="h-4 w-4" />
                          </span>
                        </summary>
                        <div className="absolute right-0 z-10 mt-1 w-32 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
                          <Button size="sm" variant="ghost" className="w-full justify-start" onClick={() => onOpen(item)}>
                            Open
                          </Button>
                          <Button size="sm" variant="ghost" className="w-full justify-start" onClick={() => onRename(item)}>
                            Rename
                          </Button>
                          <Button size="sm" variant="ghost" className="w-full justify-start" onClick={() => onMove(item)}>
                            Move
                          </Button>
                          {item.kind === "file" ? (
                            <Button size="sm" variant="ghost" className="w-full justify-start" onClick={() => onDownload(item)}>
                              Download
                            </Button>
                          ) : null}
                          <Button size="sm" variant="ghost" className="w-full justify-start" onClick={() => onShare(item)}>
                            Share
                          </Button>
                          <Button size="sm" variant="ghost" className="w-full justify-start text-rose-600" onClick={() => onDelete(item)}>
                            Delete
                          </Button>
                        </div>
                      </details>
                    </div>
                  </div>
                );
              })
            : null}
        </div>
      </div>
    </div>
  );
};

export default DriveBrowser;

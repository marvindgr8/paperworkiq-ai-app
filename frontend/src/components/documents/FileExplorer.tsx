import { useMemo } from "react";
import type { DocumentDTO, FolderDTO } from "@/lib/api";

interface Props {
  folders: FolderDTO[];
  documents: DocumentDTO[];
  currentFolderId: string | null;
  onOpenFolder: (folderId: string | null) => void;
  onSelectDocument: (doc: DocumentDTO) => void;
  onSelectFolder: (folder: FolderDTO) => void;
  selectedDocumentId?: string | null;
  selectedFolderId?: string | null;
}

const FileExplorer = ({
  folders,
  documents,
  currentFolderId,
  onOpenFolder,
  onSelectDocument,
  onSelectFolder,
  selectedDocumentId,
  selectedFolderId,
}: Props) => {
  const folderMap = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const breadcrumb = useMemo(() => {
    const chain: FolderDTO[] = [];
    let cursor = currentFolderId ? folderMap.get(currentFolderId) : undefined;
    while (cursor) {
      chain.unshift(cursor);
      cursor = cursor.parentId ? folderMap.get(cursor.parentId) : undefined;
    }
    return chain;
  }, [currentFolderId, folderMap]);

  const visibleFolders = folders
    .filter((folder) => (folder.parentId ?? null) === currentFolderId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const visibleDocuments = documents
    .filter((doc) => (doc.folderId ?? null) === currentFolderId)
    .sort((a, b) => (a.title ?? a.fileName ?? "").localeCompare(b.title ?? b.fileName ?? ""));

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200/70 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <button type="button" className="font-medium text-slate-700" onClick={() => onOpenFolder(null)}>
          Root
        </button>
        {breadcrumb.map((crumb) => (
          <span key={crumb.id}>
            / <button onClick={() => onOpenFolder(crumb.id)}>{crumb.name}</button>
          </span>
        ))}
      </div>

      <div className="space-y-2">
        {visibleFolders.map((folder) => (
          <div key={folder.id} className="flex items-center justify-between rounded-xl border border-zinc-200/60 px-3 py-2">
            <button
              className={`text-sm ${selectedFolderId === folder.id ? "font-semibold text-slate-900" : "text-slate-700"}`}
              onClick={() => onSelectFolder(folder)}
              type="button"
            >
              📁 {folder.name}
            </button>
            <button className="text-xs text-slate-500" onClick={() => onOpenFolder(folder.id)} type="button">
              Open
            </button>
          </div>
        ))}
        {visibleDocuments.map((doc) => (
          <button
            key={doc.id}
            onClick={() => onSelectDocument(doc)}
            type="button"
            className={`flex w-full items-center rounded-xl border px-3 py-2 text-left text-sm ${
              selectedDocumentId === doc.id
                ? "border-slate-900 bg-slate-50 text-slate-900"
                : "border-zinc-200/60 text-slate-700"
            }`}
          >
            📄 {doc.title ?? doc.fileName ?? "Untitled"}
          </button>
        ))}
        {visibleFolders.length === 0 && visibleDocuments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-xs text-slate-500">
            This folder is empty.
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default FileExplorer;

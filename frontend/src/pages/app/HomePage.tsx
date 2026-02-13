import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppHeader from "@/components/app/AppHeader";
import DriveBrowser, { type DriveItem } from "@/components/documents/DriveBrowser";
import UploadFirstEmptyState from "@/components/uploads/UploadFirstEmptyState";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import {
  createFolder,
  deleteDocument,
  deleteFolder,
  listDocuments,
  listFolders,
  moveDocument,
  moveFolder,
  updateFolder,
  updateDocument,
  uploadDocument,
  type DocumentDTO,
  type FolderDTO,
} from "@/lib/api";
import { useAppGate } from "@/hooks/useAppGate";

const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFolderId = searchParams.get("folderId");
  const navigate = useNavigate();
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [folders, setFolders] = useState<FolderDTO[]>([]);
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [moveDestination, setMoveDestination] = useState<string>("root");
  const { docCount, isLoading, uploadSignal } = useAppGate();

  const uploadFirst = !isLoading && docCount === 0;

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [folderResponse, docResponse] = await Promise.all([
          listFolders(),
          listDocuments({ folderId: currentFolderId ?? "root" }),
        ]);
        setFolders(folderResponse.ok ? (folderResponse.folders ?? []) : []);
        setDocuments(docResponse.ok ? (docResponse.docs ?? []) : []);
      } finally {
        setLoading(false);
      }
    };

    if (uploadFirst) {
      setFolders([]);
      setDocuments([]);
      return;
    }

    void run();
  }, [currentFolderId, uploadFirst, uploadSignal]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentFolderId]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timer = window.setTimeout(() => setToastMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const visibleFolders = useMemo(
    () => folders.filter((folder) => (folder.parentId ?? null) === (currentFolderId ?? null)),
    [currentFolderId, folders]
  );

  const items = useMemo<DriveItem[]>(() => {
    const folderItems = visibleFolders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      kind: "folder" as const,
      updatedAt: folder.updatedAt,
    }));

    const fileItems = documents.map((doc) => ({
      id: doc.id,
      name: doc.title ?? doc.fileName ?? "Untitled",
      kind: "file" as const,
      mimeType: doc.mimeType,
      updatedAt: doc.createdAt,
    }));

    return [...folderItems, ...fileItems].sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [documents, visibleFolders]);

  const folderMap = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);

  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: "Root" }];
    let cursor = currentFolderId ? folderMap.get(currentFolderId) : undefined;
    const branch: { id: string; name: string }[] = [];
    while (cursor) {
      branch.unshift({ id: cursor.id, name: cursor.name });
      cursor = cursor.parentId ? folderMap.get(cursor.parentId) : undefined;
    }
    return [...crumbs, ...branch];
  }, [currentFolderId, folderMap]);

  const selectedItems = useMemo(() => items.filter((item) => selectedIds.has(item.id)), [items, selectedIds]);
  const selectedPrimary = selectedItems[0];
  const canRename = selectedItems.length === 1;
  const canMove = selectedItems.length >= 1;
  const canDelete = selectedItems.length >= 1;

  const openFolder = (folderId: string | null) => {
    setSearchParams((params) => {
      if (folderId) {
        params.set("folderId", folderId);
      } else {
        params.delete("folderId");
      }
      return params;
    });
  };

  const handleSelect = (item: DriveItem, event: MouseEvent<HTMLButtonElement>) => {
    setSelectedIds((prev) => {
      if (event.metaKey || event.ctrlKey) {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      }
      return new Set([item.id]);
    });
  };

  const handleOpen = (item: DriveItem) => {
    if (item.kind === "folder") {
      openFolder(item.id);
      return;
    }
    navigate(`/app/doc/${item.id}`);
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      return;
    }
    const response = await createFolder({ name, parentId: currentFolderId });
    if (response.ok) {
      setCreateOpen(false);
      setNewFolderName("");
      setFolders((prev) => [...prev, response.folder]);
      setToastMessage("Folder created");
    }
  };

  const handleRename = async () => {
    if (!selectedPrimary) {
      return;
    }
    if (selectedPrimary.kind === "folder") {
      const response = await updateFolder(selectedPrimary.id, { name: renameValue.trim() });
      if (response.ok) {
        setFolders((prev) => prev.map((folder) => (folder.id === selectedPrimary.id ? response.folder : folder)));
      }
    } else {
      const response = await updateDocument(selectedPrimary.id, { name: renameValue.trim() });
      if (response.ok) {
        setDocuments((prev) => prev.map((doc) => (doc.id === selectedPrimary.id ? { ...doc, title: response.doc.title, fileName: response.doc.fileName } : doc)));
      }
    }
    setRenameOpen(false);
    setRenameValue("");
    setToastMessage("Renamed");
  };

  const handleDelete = async () => {
    const targets = [...selectedItems];
    for (const target of targets) {
      if (target.kind === "folder") {
        await deleteFolder(target.id);
      } else {
        await deleteDocument(target.id);
      }
    }
    setDeleteOpen(false);
    setSelectedIds(new Set());
    setFolders((prev) => prev.filter((folder) => !selectedIds.has(folder.id)));
    setDocuments((prev) => prev.filter((doc) => !selectedIds.has(doc.id)));
    setToastMessage("Deleted");
  };

  const handleMove = async () => {
    const destinationId = moveDestination === "root" ? null : moveDestination;
    for (const target of selectedItems) {
      if (target.kind === "folder") {
        await moveFolder(target.id, { parentId: destinationId });
      } else {
        await moveDocument(target.id, { folderId: destinationId });
      }
    }
    setMoveOpen(false);
    setSelectedIds(new Set());
    setToastMessage("Moved");
    const [folderResponse, docResponse] = await Promise.all([
      listFolders(),
      listDocuments({ folderId: currentFolderId ?? "root" }),
    ]);
    setFolders(folderResponse.ok ? (folderResponse.folders ?? []) : []);
    setDocuments(docResponse.ok ? (docResponse.docs ?? []) : []);
  };

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="Home"
        subtitle="Browse folders and files, then open a document workspace."
        actions={
          <div className="flex flex-wrap gap-2">
            <input
              ref={uploadInputRef}
              className="hidden"
              type="file"
              accept="application/pdf,image/*"
              multiple
              onChange={async (event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.length === 0) {
                  return;
                }
                await Promise.all(files.map((file) => uploadDocument(file, currentFolderId ?? undefined)));
                event.target.value = "";
                setToastMessage("Uploaded");
                const response = await listDocuments({ folderId: currentFolderId ?? "root" });
                setDocuments(response.ok ? (response.docs ?? []) : []);
              }}
            />
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              New Folder
            </Button>
            <Button size="sm" variant="outline" onClick={() => uploadInputRef.current?.click()}>
              Upload
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMoveOpen(true)} disabled={!canMove}>
              Move
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!selectedPrimary) {
                  return;
                }
                setRenameValue(selectedPrimary.name);
                setRenameOpen(true);
              }}
              disabled={!canRename}
            >
              Rename
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDeleteOpen(true)} disabled={!canDelete}>
              Delete
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {uploadFirst ? (
          <UploadFirstEmptyState
            title="Upload your first document to get started."
            description="Add a document to unlock summaries, categories, and grounded answers."
          />
        ) : (
          <DriveBrowser
            breadcrumbs={breadcrumbs}
            items={items}
            selectedIds={selectedIds}
            loading={loading}
            onNavigate={openFolder}
            onSelect={handleSelect}
            onOpen={handleOpen}
            onRename={(item) => {
              setSelectedIds(new Set([item.id]));
              setRenameValue(item.name);
              setRenameOpen(true);
            }}
            onMove={(item) => {
              setSelectedIds(new Set([item.id]));
              setMoveOpen(true);
            }}
            onDelete={(item) => {
              setSelectedIds(new Set([item.id]));
              setDeleteOpen(true);
            }}
          />
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete selected items?"
        description="This can’t be undone."
        confirmLabel="Delete"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button className="absolute inset-0 bg-black/40" type="button" onClick={() => setCreateOpen(false)} />
          <div className="relative w-full max-w-md rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-900">Create a new folder</h2>
            <div className="mt-4">
              <Input value={newFolderName} placeholder="Folder name" onChange={(event) => setNewFolderName(event.target.value)} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => void handleCreateFolder()} disabled={!newFolderName.trim()}>Create folder</Button>
            </div>
          </div>
        </div>
      ) : null}

      {renameOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button className="absolute inset-0 bg-black/40" type="button" onClick={() => setRenameOpen(false)} />
          <div className="relative w-full max-w-md rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-900">Rename item</h2>
            <div className="mt-4">
              <Input value={renameValue} placeholder="Name" onChange={(event) => setRenameValue(event.target.value)} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button onClick={() => void handleRename()} disabled={!renameValue.trim()}>Save</Button>
            </div>
          </div>
        </div>
      ) : null}

      {moveOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button className="absolute inset-0 bg-black/40" type="button" onClick={() => setMoveOpen(false)} />
          <div className="relative w-full max-w-md rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-900">Move to</h2>
            <div className="mt-4">
              <select
                className="h-11 w-full rounded-2xl border border-zinc-200 px-3 text-sm text-slate-700"
                value={moveDestination}
                onChange={(event) => setMoveDestination(event.target.value)}
              >
                <option value="root">Root</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setMoveOpen(false)}>Cancel</Button>
              <Button onClick={() => void handleMove()}>Move</Button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} /> : null}
    </div>
  );
};

export default HomePage;

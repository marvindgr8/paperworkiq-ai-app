import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppHeader from "@/components/app/AppHeader";
import DriveBrowser, { type DriveItem } from "@/components/documents/DriveBrowser";
import SelectionBar from "@/components/documents/SelectionBar";
import UploadFirstEmptyState from "@/components/uploads/UploadFirstEmptyState";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import HomeChatDock from "@/components/chat/HomeChatDock";
import {
  createFolder,
  deleteDocument,
  downloadDocumentFile,
  deleteFolder,
  listDocuments,
  listFolders,
  moveDocument,
  moveFolder,
  shareDocument,
  shareFolder,
  updateDocument,
  updateFolder,
  uploadFiles,
  uploadFolder,
  type DocumentDTO,
  type FolderDTO,
} from "@/lib/api";
import { useAppGate } from "@/hooks/useAppGate";
import { getDroppedEntries } from "@/lib/droppedEntries";

const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFolderId = searchParams.get("folderId");
  const createRequested = searchParams.get("create") === "1";
  const navigate = useNavigate();

  const [folders, setFolders] = useState<FolderDTO[]>([]);
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragMessage, setDragMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const dragDepthRef = useRef(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<"VIEW" | "EDIT">("VIEW");
  const [newFolderName, setNewFolderName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [moveDestination, setMoveDestination] = useState<string>("root");
  const { docCount, isLoading, uploadSignal, registerSidebarActions } = useAppGate();

  const uploadFirst = !isLoading && docCount === 0;

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
    setLastSelectedId(null);
  }, []);

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
    clearSelection();
  }, [clearSelection, currentFolderId]);

  useEffect(() => {
    const preventWindowDropNavigation = (event: globalThis.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("dragover", preventWindowDropNavigation);
    window.addEventListener("drop", preventWindowDropNavigation);

    return () => {
      window.removeEventListener("dragover", preventWindowDropNavigation);
      window.removeEventListener("drop", preventWindowDropNavigation);
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timer = window.setTimeout(() => setToastMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!createRequested) {
      return;
    }
    setCreateOpen(true);
    setSearchParams((params) => {
      params.delete("create");
      return params;
    });
  }, [createRequested, setSearchParams]);

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

  const selectedDriveItems = useMemo(() => {
    const selectedIdSet = new Set(selectedItems);
    return items.filter((item) => selectedIdSet.has(item.id));
  }, [items, selectedItems]);

  const selectedPrimary = selectedDriveItems[0];
  const canRename = selectedItems.length === 1;
  const selectedFileIds = useMemo(() => selectedDriveItems.filter((item) => item.kind === "file").map((item) => item.id), [selectedDriveItems]);
  const selectedFolderIds = useMemo(() => selectedDriveItems.filter((item) => item.kind === "folder").map((item) => item.id), [selectedDriveItems]);
  const currentFolderName = currentFolderId ? folderMap.get(currentFolderId)?.name ?? "Folder" : "Root";

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

  const handleSelect = (item: DriveItem, event: MouseEvent<HTMLDivElement>) => {
    if (isUploading) {
      return;
    }
    setSelectedItems((prev) => {
      if (event.shiftKey && lastSelectedId) {
        const currentIndex = items.findIndex((entry) => entry.id === item.id);
        const lastIndex = items.findIndex((entry) => entry.id === lastSelectedId);
        if (currentIndex >= 0 && lastIndex >= 0) {
          const [start, end] = currentIndex < lastIndex ? [currentIndex, lastIndex] : [lastIndex, currentIndex];
          const rangeIds = items.slice(start, end + 1).map((entry) => entry.id);
          const baseIds = event.metaKey || event.ctrlKey ? prev : [];
          return Array.from(new Set([...baseIds, ...rangeIds]));
        }
      }

      if (event.metaKey || event.ctrlKey) {
        if (prev.includes(item.id)) {
          return prev.filter((id) => id !== item.id);
        }
        return [...prev, item.id];
      }

      return [item.id];
    });
    setLastSelectedId(item.id);
  };

  const handleOpen = (item: DriveItem) => {
    if (item.kind === "folder") {
      openFolder(item.id);
      return;
    }
    navigate(`/app/doc/${item.id}`);
  };

  const refreshItems = useCallback(async () => {
    const [folderResponse, docResponse] = await Promise.all([
      listFolders(),
      listDocuments({ folderId: currentFolderId ?? "root" }),
    ]);
    setFolders(folderResponse.ok ? (folderResponse.folders ?? []) : []);
    setDocuments(docResponse.ok ? (docResponse.docs ?? []) : []);
  }, [currentFolderId]);

  const handleUploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      return;
    }
    setIsUploading(true);
    setDragMessage(`Uploading ${files.length} item${files.length === 1 ? "" : "s"}…`);
    await uploadFiles(files, currentFolderId ?? undefined);
    setToastMessage("Uploaded");
    await refreshItems();
    clearSelection();
    setIsUploading(false);
    setDragMessage(null);
  }, [clearSelection, currentFolderId, refreshItems]);

  const handleUploadFolder = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    setIsUploading(true);
    setDragMessage(`Uploading ${files.length} item${files.length === 1 ? "" : "s"}…`);

    const response = await uploadFolder(
      files,
      files.map((file) => {
        const folderFile = file as File & { webkitRelativePath?: string };
        return folderFile.webkitRelativePath || file.name;
      }),
      currentFolderId ?? undefined
    );
    if (!response.ok) {
      setToastMessage("Folder upload failed");
      setIsUploading(false);
      setDragMessage(null);
      return;
    }

    clearSelection();
    await refreshItems();
    setToastMessage("Folder uploaded");
    setIsUploading(false);
    setDragMessage(null);
  }, [clearSelection, currentFolderId, refreshItems]);

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    dragDepthRef.current = 0;
    setIsDragActive(false);

    if (isUploading) {
      return;
    }

    const droppedEntries = await getDroppedEntries(event.dataTransfer.items);
    if (droppedEntries && droppedEntries.length > 0) {
      const files = droppedEntries.map((entry) => entry.file);
      const paths = droppedEntries.map((entry) => entry.relativePath);
      const hasFolderStructure = paths.some((path) => path.includes("/"));

      setIsUploading(true);
      setDragMessage(`Uploading ${files.length} item${files.length === 1 ? "" : "s"}…`);

      if (hasFolderStructure) {
        const response = await uploadFolder(files, paths, currentFolderId ?? undefined);
        if (!response.ok) {
          setToastMessage("Folder upload failed");
          setIsUploading(false);
          setDragMessage(null);
          return;
        }
      } else {
        await uploadFiles(files, currentFolderId ?? undefined);
      }

      await refreshItems();
      clearSelection();
      setToastMessage("Upload complete");
      setIsUploading(false);
      setDragMessage(null);
      return;
    }

    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) {
      return;
    }

    console.info("Entries API unavailable, falling back to flat file upload.");
    await handleUploadFiles(files);
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

  const handleRenameSelected = async () => {
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
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === selectedPrimary.id ? { ...doc, title: response.doc.title, fileName: response.doc.fileName } : doc
          )
        );
      }
    }
    setRenameOpen(false);
    setRenameValue("");
    clearSelection();
    setToastMessage("Renamed");
  };

  const handleDeleteSelected = async () => {
    for (const target of selectedDriveItems) {
      if (target.kind === "folder") {
        await deleteFolder(target.id);
      } else {
        await deleteDocument(target.id);
      }
    }
    setDeleteOpen(false);
    const selectedIdSet = new Set(selectedItems);
    setFolders((prev) => prev.filter((folder) => !selectedIdSet.has(folder.id)));
    setDocuments((prev) => prev.filter((doc) => !selectedIdSet.has(doc.id)));
    clearSelection();
    setToastMessage("Deleted");
  };


  const handleDownloadSelected = async () => {
    const selectedFileSet = new Set(selectedFileIds);
    const filesToDownload = documents.filter((doc) => selectedFileSet.has(doc.id));
    for (const file of filesToDownload) {
      await downloadDocumentFile(file.id, file.fileName ?? undefined);
    }
  };

  const handleMoveSelected = async () => {
    const destinationId = moveDestination === "root" ? null : moveDestination;
    for (const target of selectedDriveItems) {
      if (target.kind === "folder") {
        await moveFolder(target.id, { parentId: destinationId });
      } else {
        await moveDocument(target.id, { folderId: destinationId });
      }
    }
    setMoveOpen(false);
    clearSelection();
    setToastMessage("Moved");
    await refreshItems();
  };

  const handleShareSelected = async () => {
    if (!selectedPrimary) {
      return;
    }

    const email = shareEmail.trim();
    if (!email) {
      return;
    }

    const response =
      selectedPrimary.kind === "folder"
        ? await shareFolder(selectedPrimary.id, { email, permission: sharePermission })
        : await shareDocument(selectedPrimary.id, { email, permission: sharePermission });

    if (!response.ok) {
      setToastMessage(response.error ?? "Unable to share item");
      return;
    }

    setShareOpen(false);
    setShareEmail("");
    setSharePermission("VIEW");
    setToastMessage("Shared");
  };

  useEffect(() => {
    registerSidebarActions({
      openNewFolderModal: () => {
        setCreateOpen(true);
        setSearchParams((params) => {
          params.delete("create");
          return params;
        });
      },
      uploadFiles: handleUploadFiles,
      uploadFolder: handleUploadFolder,
    });

    return () => registerSidebarActions(null);
  }, [handleUploadFiles, handleUploadFolder, registerSidebarActions, setSearchParams]);

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="Home"
        subtitle="Browse folders and files, then open a document workspace."
      />

      <div className="relative flex-1 overflow-hidden" onClick={clearSelection}>
        <div className="h-full overflow-y-auto px-6 py-6 pr-6 md:pr-[430px]">
          {uploadFirst ? (
            <UploadFirstEmptyState
              title="Upload your first document to get started."
              description="Add a document to unlock summaries, categories, and grounded answers."
            />
          ) : (
            <div onClick={(event) => event.stopPropagation()}>
            {dragMessage ? <p className="mb-3 text-sm text-slate-600">{dragMessage}</p> : null}
            {selectedItems.length > 0 ? (
              <SelectionBar
                selectedCount={selectedItems.length}
                renameDisabled={!canRename}
                shareDisabled={!canRename || isUploading}
                downloadDisabled={selectedFileIds.length === 0 || isUploading}
                onClearSelection={clearSelection}
                onDownload={() => {
                  if (!isUploading) {
                    void handleDownloadSelected();
                  }
                }}
                onMove={() => { if (!isUploading) setMoveOpen(true); }}
                onShare={() => {
                  if (!selectedPrimary) {
                    return;
                  }
                  if (isUploading) {
                    return;
                  }
                  setShareOpen(true);
                }}
                onRename={() => {
                  if (!selectedPrimary) {
                    return;
                  }
                  if (isUploading) {
                    return;
                  }
                  setRenameValue(selectedPrimary.name);
                  setRenameOpen(true);
                }}
                onDelete={() => { if (!isUploading) setDeleteOpen(true); }}
              />
            ) : null}
            <div
              className="relative"
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(event) => {
                void handleDrop(event);
              }}
            >
              {isDragActive ? (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-blue-400 bg-white/70">
                  <div className="text-sm font-medium text-gray-700">Drop files or folders to upload</div>
                </div>
              ) : null}
              <DriveBrowser
                breadcrumbs={breadcrumbs}
                items={items}
                selectedIds={selectedItems}
                loading={loading}
                onNavigate={openFolder}
                onSelect={handleSelect}
                onOpen={handleOpen}
                onClearSelection={clearSelection}
                onRename={(item) => {
                  if (isUploading) {
                    return;
                  }
                  setSelectedItems([item.id]);
                  setLastSelectedId(item.id);
                  setRenameValue(item.name);
                  setRenameOpen(true);
                }}
                onDownload={(item) => {
                  if (isUploading || item.kind !== "file") {
                    return;
                  }
                  const matchingDocument = documents.find((doc) => doc.id === item.id);
                  if (!matchingDocument) {
                    return;
                  }
                  void downloadDocumentFile(matchingDocument.id, matchingDocument.fileName ?? undefined);
                }}
                onMove={(item) => {
                  if (isUploading) {
                    return;
                  }
                  setSelectedItems([item.id]);
                  setLastSelectedId(item.id);
                  setMoveOpen(true);
                }}
                onDelete={(item) => {
                  if (isUploading) {
                    return;
                  }
                  setSelectedItems([item.id]);
                  setLastSelectedId(item.id);
                  setDeleteOpen(true);
                }}
                onShare={(item) => {
                  if (isUploading) {
                    return;
                  }
                  setSelectedItems([item.id]);
                  setLastSelectedId(item.id);
                  setShareOpen(true);
                }}
              />
            </div>
          </div>
        )}
        </div>

        {!uploadFirst ? (
          <HomeChatDock
            currentFolderId={currentFolderId}
            currentFolderName={currentFolderName}
            selectedFileIds={selectedFileIds}
            selectedFolderIds={selectedFolderIds}
            onClearSelection={clearSelection}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete selected items?"
        description="This can’t be undone."
        confirmLabel="Delete"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDeleteSelected}
      />

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            className="absolute inset-0 bg-black/40"
            type="button"
            onClick={() => {
              setCreateOpen(false);
              setSearchParams((params) => {
                params.delete("create");
                return params;
              });
            }}
          />
          <div className="relative w-full max-w-md rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-900">Create a new folder</h2>
            <div className="mt-4">
              <Input value={newFolderName} placeholder="Folder name" onChange={(event) => setNewFolderName(event.target.value)} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  setSearchParams((params) => {
                    params.delete("create");
                    return params;
                  });
                }}
              >
                Cancel
              </Button>
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
              <Button onClick={() => void handleRenameSelected()} disabled={!renameValue.trim()}>Save</Button>
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
              <Button onClick={() => void handleMoveSelected()}>Move</Button>
            </div>
          </div>
        </div>
      ) : null}

      

      {shareOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button className="absolute inset-0 bg-black/40" type="button" onClick={() => setShareOpen(false)} />
          <div className="relative w-full max-w-md rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-900">Share item</h2>
            <p className="mt-1 text-sm text-slate-500">Invite someone by email to view or edit this item.</p>
            <div className="mt-4 space-y-3">
              <Input value={shareEmail} placeholder="teammate@example.com" onChange={(event) => setShareEmail(event.target.value)} />
              <select
                className="h-11 w-full rounded-2xl border border-zinc-200 px-3 text-sm text-slate-700"
                value={sharePermission}
                onChange={(event) => setSharePermission(event.target.value as "VIEW" | "EDIT")}
              >
                <option value="VIEW">Can view</option>
                <option value="EDIT">Can edit</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShareOpen(false)}>Cancel</Button>
              <Button onClick={() => void handleShareSelected()} disabled={!shareEmail.trim()}>Share</Button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} /> : null}
    </div>
  );
};

export default HomePage;

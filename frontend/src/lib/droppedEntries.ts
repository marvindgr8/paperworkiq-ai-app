export interface DroppedFileEntry {
  file: File;
  relativePath: string;
}

interface DndFileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}

interface DndFileSystemFileEntry extends DndFileSystemEntry {
  isFile: true;
  file: (callback: (file: File) => void, errorCallback?: (error: DOMException) => void) => void;
}

interface DndFileSystemDirectoryReader {
  readEntries: (
    successCallback: (entries: DndFileSystemEntry[]) => void,
    errorCallback?: (error: DOMException) => void
  ) => void;
}

interface DndFileSystemDirectoryEntry extends DndFileSystemEntry {
  isDirectory: true;
  createReader: () => DndFileSystemDirectoryReader;
}

type DataTransferItemWithEntry = DataTransferItem & {
  webkitGetAsEntry?: () => DndFileSystemEntry | null;
};

const fileFromFileEntry = (entry: DndFileSystemFileEntry) =>
  new Promise<File>((resolve, reject) => {
    entry.file(resolve, reject);
  });

const readAllDirectoryEntries = async (entry: DndFileSystemDirectoryEntry) => {
  const reader = entry.createReader();
  const allEntries: DndFileSystemEntry[] = [];

  while (true) {
    const batch = await new Promise<DndFileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });

    if (batch.length === 0) {
      break;
    }

    allEntries.push(...batch);
  }

  return allEntries;
};

const walkEntry = async (entry: DndFileSystemEntry, prefix: string): Promise<DroppedFileEntry[]> => {
  if (entry.isFile) {
    const file = await fileFromFileEntry(entry as DndFileSystemFileEntry);
    return [{ file, relativePath: prefix || file.name }];
  }

  if (!entry.isDirectory) {
    return [];
  }

  const children = await readAllDirectoryEntries(entry as DndFileSystemDirectoryEntry);
  const nestedFiles = await Promise.all(
    children.map((child) => walkEntry(child, `${prefix}/${child.name}`))
  );
  return nestedFiles.flat();
};

export const getDroppedEntries = async (dataTransferItems: DataTransferItemList) => {
  const items = Array.from(dataTransferItems);
  const supportsEntriesApi = items.some(
    (item) => typeof (item as DataTransferItemWithEntry).webkitGetAsEntry === "function"
  );

  if (!supportsEntriesApi) {
    // Fallback for browsers that don't expose webkitGetAsEntry: upload as flat files.
    return null;
  }

  const droppedItems = await Promise.all(
    items.map(async (item) => {
      if (item.kind !== "file") {
        return [] as DroppedFileEntry[];
      }

      const entry = (item as DataTransferItemWithEntry).webkitGetAsEntry?.();
      if (!entry) {
        return [] as DroppedFileEntry[];
      }

      return walkEntry(entry, entry.name);
    })
  );

  // Empty folders are not represented as file entries in drag/drop payloads.
  return droppedItems.flat();
};

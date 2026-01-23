import path from "node:path";
import fs from "node:fs/promises";

const uploadDir = path.join(process.cwd(), "uploads");

export const ensureUploadDir = async () => {
  await fs.mkdir(uploadDir, { recursive: true });
};

export const getUploadDir = () => uploadDir;

export const resolveStoragePath = (storageKey: string) => path.join(uploadDir, storageKey);

export const readStoredFile = async (storageKey: string) => {
  const filePath = resolveStoragePath(storageKey);
  return fs.readFile(filePath);
};

export const deleteStoredFile = async (storageKey: string | null | undefined) => {
  if (!storageKey) {
    return;
  }
  try {
    await fs.unlink(resolveStoragePath(storageKey));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
};

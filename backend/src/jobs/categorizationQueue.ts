import { runCategorization } from "../services/categorizationService.js";

const queue: string[] = [];
let isProcessing = false;

const processQueue = async () => {
  if (isProcessing) {
    return;
  }
  isProcessing = true;
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) {
      continue;
    }
    try {
      await runCategorization(next);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Categorization failed", error);
    }
  }
  isProcessing = false;
};

export const enqueueCategorization = (documentId: string) => {
  queue.push(documentId);
  void processQueue();
};

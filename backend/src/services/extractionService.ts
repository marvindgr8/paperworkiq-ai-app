import { enqueueDocumentProcessing, processDocument } from "./documentProcessing.js";

export const runExtraction = async (documentId: string) => processDocument(documentId);

export const enqueueExtraction = (documentId: string) => {
  enqueueDocumentProcessing(documentId);
};

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface AuthResponse {
  ok: boolean;
  token?: string;
}

const getToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("paperworkiq_token");
};

const authHeaders = () => {
  const token = getToken();
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};

export const register = async (payload: { email: string; password: string; name?: string }) => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const login = async (payload: { email: string; password: string }) => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const me = async (token: string) => {
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

export type ChatScope = "WORKSPACE" | "DOCUMENT";

export interface FolderDTO {
  id: string;
  name: string;
  ownerId: string;
  parentId?: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSessionDTO {
  id: string;
  createdAt: string;
  scope: ChatScope;
  documentId?: string | null;
}

export interface ChatMessageDTO {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
  citations?: {
    documentId: string;
    documentTitle: string;
    page?: number;
    snippet?: string;
    field?: string;
  }[];
}

export interface CategoryDTO {
  id: string;
  name: string;
}

export const listChatSessions = async (options?: {
  scope?: ChatScope;
  documentId?: string;
  folderId?: string;
}) => {
  const url = new URL(`${baseUrl}/api/chat/sessions`);
  if (options?.scope) {
    url.searchParams.set("scope", options.scope);
  }
  if (options?.documentId) {
    url.searchParams.set("documentId", options.documentId);
  }
  if (options?.folderId) {
    url.searchParams.set("folderId", options.folderId);
  }
  const response = await fetch(url.toString(), {
    headers: { ...authHeaders() },
  });
  return response.json();
};

export const createChatSession = async (options?: {
  scope?: ChatScope;
  documentId?: string;
  folderId?: string;
}) => {
  const payload: { scope?: ChatScope; documentId?: string; folderId?: string } = {};
  if (options?.scope) {
    payload.scope = options.scope;
  }
  if (options?.documentId) {
    payload.documentId = options.documentId;
  }
  if (options?.folderId) {
    payload.folderId = options.folderId;
  }
  const response = await fetch(`${baseUrl}/api/chat/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const listChatMessages = async (
  sessionId: string,
  options?: { scope?: ChatScope; documentId?: string; folderId?: string }
) => {
  const url = new URL(`${baseUrl}/api/chat/sessions/${sessionId}/messages`);
  if (options?.scope) {
    url.searchParams.set("scope", options.scope);
  }
  if (options?.documentId) {
    url.searchParams.set("documentId", options.documentId);
  }
  if (options?.folderId) {
    url.searchParams.set("folderId", options.folderId);
  }
  const response = await fetch(url.toString(), {
    headers: { ...authHeaders() },
  });
  return response.json();
};

export const sendChatMessage = async (
  sessionId: string,
  content: string,
  options?: { scope?: ChatScope; documentId?: string; folderId?: string }
) => {
  const payload: { content: string; scope?: ChatScope; documentId?: string; folderId?: string } = { content };
  if (options?.scope) {
    payload.scope = options.scope;
  }
  if (options?.documentId) {
    payload.documentId = options.documentId;
  }
  if (options?.folderId) {
    payload.folderId = options.folderId;
  }
  const response = await fetch(`${baseUrl}/api/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export interface DocumentDTO {
  id: string;
  title?: string | null;
  type?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  status: string;
  aiStatus?: string | null;
  category?: CategoryDTO | null;
  folderId?: string | null;
  categoryLabel?: string | null;
  fileHash?: string | null;
  summary?: string | null;
  rawText?: string | null;
  ocrPages?: string[] | null;
  extractData?: Record<string, unknown> | null;
  fields?: Array<{
    id: string;
    key: string;
    valueText?: string | null;
    valueNumber?: number | null;
    valueDate?: string | null;
    confidence?: number | null;
    sourcePage?: number | null;
    sourceSnippet?: string | null;
  }>;
  processedAt?: string | null;
  processingError?: string | null;
  sensitiveDetected?: boolean | null;
  createdAt: string;
}

export interface DocumentSearchResult {
  id: string;
  title?: string | null;
  fileName?: string | null;
  status: string;
  category?: CategoryDTO | null;
  folderId?: string | null;
  categoryLabel?: string | null;
  createdAt: string;
  previewThumbUrl?: string | null;
}

export const listDocuments = async (options?: { categoryId?: string; folderId?: string }) => {
  const url = new URL(`${baseUrl}/api/docs`);
  if (options?.categoryId) {
    url.searchParams.set("categoryId", options.categoryId);
  }
  if (options?.folderId) {
    url.searchParams.set("folderId", options.folderId);
  }
  const response = await fetch(url.toString(), {
    headers: { ...authHeaders() },
  });
  return response.json();
};

export const listCategories = async () => {
  const response = await fetch(`${baseUrl}/api/categories`, {
    headers: { ...authHeaders() },
  });
  return response.json();
};

export const getDocumentCount = async () => {
  const response = await fetch(`${baseUrl}/api/docs/count`, {
    headers: { ...authHeaders() },
  });
  return response.json();
};

export const searchDocuments = async (options: { query: string; limit?: number }) => {
  const url = new URL(`${baseUrl}/api/documents/search`);
  url.searchParams.set("q", options.query);
  if (options.limit) {
    url.searchParams.set("limit", String(options.limit));
  }
  const response = await fetch(url.toString(), {
    headers: { ...authHeaders() },
  });
  return response.json();
};

export const uploadDocument = async (file: File, folderId?: string) => {
  const formData = new FormData();
  formData.append("file", file);
  if (folderId) {
    formData.append("folderId", folderId);
  }
  const response = await fetch(`${baseUrl}/api/documents/upload`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });
  return response.json();
};


export const uploadFiles = async (files: File[], parentFolderId?: string) => {
  return Promise.all(files.map((file) => uploadDocument(file, parentFolderId)));
};


export const uploadFolder = async (files: File[], paths: string[], parentFolderId?: string) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  formData.append("paths", JSON.stringify(paths));
  if (parentFolderId) {
    formData.append("parentFolderId", parentFolderId);
  }

  const response = await fetch(`${baseUrl}/api/files/upload-folder`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });
  return response.json();
};

export const getDocument = async (id: string) => {
  const response = await fetch(`${baseUrl}/api/docs/${id}`, {
    headers: { ...authHeaders() },
  });
  return response.json();
};



export const updateDocument = async (id: string, payload: { name: string }) => {
  const response = await fetch(`${baseUrl}/api/docs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return response.json();
};
export const deleteDocument = async (id: string) => {
  const response = await fetch(`${baseUrl}/api/documents/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return response.json();
};

export const reprocessDocument = async (id: string) => {
  const response = await fetch(`${baseUrl}/api/documents/${id}/reprocess`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return response.json();
};

export const fetchDocumentPreviewUrl = async (id: string) => {
  const response = await fetch(`${baseUrl}/api/documents/${id}/preview`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) {
    throw new Error("Unable to fetch preview");
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const downloadDocumentFile = async (id: string, fileName?: string) => {
  const response = await fetch(`${baseUrl}/api/documents/${id}/file?download=1`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) {
    throw new Error("Unable to download file");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName ?? "document";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};


export const listFolders = async () => {
  const response = await fetch(`${baseUrl}/api/folders`, { headers: { ...authHeaders() } });
  return response.json();
};

export const createFolder = async (payload: { name: string; parentId?: string | null }) => {
  const response = await fetch(`${baseUrl}/api/folders/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const updateFolder = async (id: string, payload: { name: string }) => {
  const response = await fetch(`${baseUrl}/api/folders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const moveFolder = async (id: string, payload: { parentId?: string | null }) => {
  const response = await fetch(`${baseUrl}/api/folders/${id}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const deleteFolder = async (id: string) => {
  const response = await fetch(`${baseUrl}/api/folders/${id}`, { method: "DELETE", headers: { ...authHeaders() } });
  return response.json();
};

export const moveDocument = async (id: string, payload: { folderId?: string | null }) => {
  const response = await fetch(`${baseUrl}/api/docs/${id}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return response.json();
};

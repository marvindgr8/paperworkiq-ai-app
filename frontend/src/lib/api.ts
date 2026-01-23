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

export interface ChatSessionDTO {
  id: string;
  createdAt: string;
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

export const listChatSessions = async () => {
  const response = await fetch(`${baseUrl}/api/chat/sessions`, {
    headers: { ...authHeaders() },
  });
  return response.json();
};

export const createChatSession = async () => {
  const response = await fetch(`${baseUrl}/api/chat/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({}),
  });
  return response.json();
};

export const listChatMessages = async (sessionId: string) => {
  const response = await fetch(`${baseUrl}/api/chat/sessions/${sessionId}/messages`, {
    headers: { ...authHeaders() },
  });
  return response.json();
};

export const sendChatMessage = async (
  sessionId: string,
  content: string,
  options?: { documentId?: string }
) => {
  const payload: { content: string; documentId?: string } = { content };
  if (options?.documentId) {
    payload.documentId = options.documentId;
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
  fileUrl?: string | null;
  previewImageUrl?: string | null;
  summary?: string | null;
  ocrText?: string | null;
  ocrPages?: string[] | null;
  extractData?: Record<string, unknown> | null;
  createdAt: string;
}

export const listDocuments = async (options?: { categoryId?: string }) => {
  const url = new URL(`${baseUrl}/api/docs`);
  if (options?.categoryId) {
    url.searchParams.set("categoryId", options.categoryId);
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

export const uploadDocument = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${baseUrl}/api/documents/upload`, {
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

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

export const sendChatMessage = async (sessionId: string, content: string) => {
  const response = await fetch(`${baseUrl}/api/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ content }),
  });
  return response.json();
};

export interface DocumentDTO {
  id: string;
  title?: string | null;
  fileName?: string | null;
  status: string;
  createdAt: string;
}

export const listDocuments = async () => {
  const response = await fetch(`${baseUrl}/api/docs`, {
    headers: { ...authHeaders() },
  });
  return response.json();
};

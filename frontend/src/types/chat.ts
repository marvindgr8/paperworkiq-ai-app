export type ChatRole = "USER" | "ASSISTANT";

export interface Citation {
  documentId: string;
  documentTitle: string;
  page?: number;
  snippet?: string;
  field?: string;
}

export interface ChatMessageDTO {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  citations?: Citation[];
}

export interface ChatSessionDTO {
  id: string;
  createdAt: string;
}

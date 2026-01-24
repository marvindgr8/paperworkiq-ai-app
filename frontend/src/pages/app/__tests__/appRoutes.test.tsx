import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import App from "@/App";
import type { DocumentDTO } from "@/lib/api";

let mockDocCount = 0;

const listDocuments = vi.fn();
const listCategories = vi.fn();
const getDocument = vi.fn();

vi.mock("@/hooks/useDocumentCount", () => ({
  useDocumentCount: () => ({
    count: mockDocCount,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

const useChatSessions = vi.fn();
const useChatSession = vi.fn();

vi.mock("@/hooks/useChatSessions", () => ({
  useChatSessions,
}));

vi.mock("@/hooks/useChatSession", () => ({
  useChatSession,
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    listDocuments,
    listCategories,
    getDocument,
    fetchDocumentPreviewUrl: vi.fn().mockResolvedValue("blob:preview"),
    sendChatMessage: vi.fn(),
  };
});

const renderApp = (route: string) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  );

describe("app routes", () => {
  beforeEach(() => {
    listDocuments.mockReset();
    listCategories.mockReset();
    getDocument.mockReset();
    listCategories.mockResolvedValue({ ok: true, categories: [] });
    useChatSessions.mockReset();
    useChatSession.mockReset();
    useChatSessions.mockReturnValue({ sessions: [], startNewSession: vi.fn() });
    useChatSession.mockReturnValue({ messages: [], setMessages: vi.fn() });
  });

  it("renders upload-first home on /app", async () => {
    mockDocCount = 0;
    listDocuments.mockResolvedValue({ ok: true, docs: [] });

    renderApp("/app");

    expect(await screen.findByText("Upload documents")).toBeInTheDocument();
    expect(screen.getByText("Upload your first document to get started.")).toBeInTheDocument();
  });

  it("shows the upload card when no document is selected", async () => {
    mockDocCount = 1;
    const doc: DocumentDTO = {
      id: "doc-100",
      title: "Utility bill",
      fileName: "bill.pdf",
      mimeType: "image/png",
      status: "READY",
      createdAt: new Date().toISOString(),
    };
    listDocuments.mockResolvedValue({ ok: true, docs: [doc] });

    renderApp("/app/home");

    expect(await screen.findByText("Recent documents")).toBeInTheDocument();
    expect(screen.queryByText("Choose files")).not.toBeInTheDocument();
    expect(screen.getByText("Select a document to preview")).toBeInTheDocument();
  });

  it("shows a document preview when a document row is clicked", async () => {
    mockDocCount = 1;
    const doc: DocumentDTO = {
      id: "doc-123",
      title: "Council tax reminder",
      fileName: "council.pdf",
      mimeType: "image/png",
      status: "READY",
      createdAt: new Date().toISOString(),
    };
    listDocuments.mockResolvedValue({ ok: true, docs: [doc] });
    getDocument.mockResolvedValue({
      ok: true,
      doc: {
        ...doc,
        rawText: "Due date 2024-01-01",
        fields: [
          {
            id: "field-1",
            key: "Due date",
            valueDate: "2024-01-01",
          },
        ],
      },
    });

    renderApp("/app");

    const row = await screen.findByText("Council tax reminder");
    fireEvent.click(row);

    expect(await screen.findByText("Open document")).toBeInTheDocument();
    expect(screen.queryByText("Extracted fields")).not.toBeInTheDocument();
    expect(screen.queryByText("Choose files")).not.toBeInTheDocument();
  });

  it("renders global chat at /app/chat", async () => {
    mockDocCount = 1;
    renderApp("/app/chat");

    expect(await screen.findByText("Chat")).toBeInTheDocument();
    expect(
      screen.getByText("Ask anything about your documents, bills, and records.")
    ).toBeInTheDocument();
    expect(screen.getByText("Search across your documents.")).toBeInTheDocument();
  });

  it("navigates to the document workspace from Home", async () => {
    mockDocCount = 1;
    const doc: DocumentDTO = {
      id: "doc-456",
      title: "Lease agreement",
      fileName: "lease.pdf",
      mimeType: "image/png",
      status: "READY",
      createdAt: new Date().toISOString(),
    };
    listDocuments.mockResolvedValue({ ok: true, docs: [doc] });
    getDocument.mockResolvedValue({
      ok: true,
      doc: {
        ...doc,
        rawText: "Lease term is 12 months",
        fields: [
          {
            id: "field-2",
            key: "Term",
            valueText: "12 months",
          },
        ],
      },
    });

    renderApp("/app/home");

    const row = await screen.findByText("Lease agreement");
    fireEvent.click(row);

    const openButton = await screen.findByText("Open document");
    fireEvent.click(openButton);

    expect(await screen.findByText("Document view")).toBeInTheDocument();
    expect(screen.getByText("Ask AI about this document")).toBeInTheDocument();
  });

  it("renders document workspace panels at /app/doc/:id", async () => {
    mockDocCount = 1;
    const doc: DocumentDTO = {
      id: "doc-789",
      title: "Bank statement",
      fileName: "statement.pdf",
      mimeType: "image/png",
      status: "READY",
      createdAt: new Date().toISOString(),
    };
    getDocument.mockResolvedValue({ ok: true, doc });

    renderApp("/app/doc/doc-789");

    expect(await screen.findByText("Document view")).toBeInTheDocument();
    expect(screen.getByText("Ask AI about this document")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("resets chat state when switching from document chat to global chat", async () => {
    mockDocCount = 1;
    const doc: DocumentDTO = {
      id: "doc-202",
      title: "Loan offer",
      fileName: "loan.pdf",
      mimeType: "application/pdf",
      status: "READY",
      createdAt: new Date().toISOString(),
    };
    getDocument.mockResolvedValue({ ok: true, doc });

    useChatSessions.mockImplementation((options: { scope: string }) => ({
      sessions: [
        {
          id: options.scope === "DOCUMENT" ? "doc-session" : "workspace-session",
          createdAt: new Date().toISOString(),
          scope: options.scope,
          documentId: options.scope === "DOCUMENT" ? "doc-202" : null,
        },
      ],
      startNewSession: vi.fn(),
    }));

    useChatSession.mockImplementation((sessionId?: string, options?: { scope?: string }) => ({
      messages:
        options?.scope === "DOCUMENT"
          ? [
              {
                id: "doc-msg",
                role: "USER",
                content: "Doc-specific message",
                createdAt: new Date().toISOString(),
              },
            ]
          : [
              {
                id: "workspace-msg",
                role: "USER",
                content: "Workspace message",
                createdAt: new Date().toISOString(),
              },
            ],
      setMessages: vi.fn(),
    }));

    const { rerender } = renderApp("/app/doc/doc-202");

    expect(await screen.findByText("Doc-specific message")).toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={["/app/chat"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText("Workspace message")).toBeInTheDocument();
    expect(screen.queryByText("Doc-specific message")).not.toBeInTheDocument();
  });

  it("redirects /app/inbox to /app/home", async () => {
    mockDocCount = 0;
    listDocuments.mockResolvedValue({ ok: true, docs: [] });

    renderApp("/app/inbox");

    expect(await screen.findByText("Upload documents")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("renders simplified sidebar without overview or categories", async () => {
    mockDocCount = 0;
    listDocuments.mockResolvedValue({ ok: true, docs: [] });

    renderApp("/app");

    expect(await screen.findByText("Home")).toBeInTheDocument();
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
    expect(screen.queryByText("Categories")).not.toBeInTheDocument();
    expect(screen.queryByText("All documents")).not.toBeInTheDocument();
  });
});

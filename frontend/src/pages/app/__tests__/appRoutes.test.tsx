import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import App from "@/App";
import type { DocumentDTO } from "@/lib/api";

let mockDocCount = 0;

const listDocuments = vi.fn();
const getDocument = vi.fn();

vi.mock("@/hooks/useDocumentCount", () => ({
  useDocumentCount: () => ({
    count: mockDocCount,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useChatSessions", () => ({
  useChatSessions: () => ({ sessions: [], startNewSession: vi.fn() }),
}));

vi.mock("@/hooks/useChatSession", () => ({
  useChatSession: () => ({ messages: [], setMessages: vi.fn() }),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    listDocuments,
    getDocument,
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
    getDocument.mockReset();
  });

  it("renders upload-first inbox on /app", async () => {
    mockDocCount = 0;
    listDocuments.mockResolvedValue({ ok: true, docs: [] });

    renderApp("/app");

    expect(await screen.findByText("Upload paperwork")).toBeInTheDocument();
    expect(screen.getByText("Upload your first document")).toBeInTheDocument();
  });

  it("navigates to /app/doc/:id when a document row is clicked", async () => {
    mockDocCount = 1;
    const doc: DocumentDTO = {
      id: "doc-123",
      title: "Council tax reminder",
      fileName: "council.pdf",
      status: "READY",
      createdAt: new Date().toISOString(),
    };
    listDocuments.mockResolvedValue({ ok: true, docs: [doc] });
    getDocument.mockResolvedValue({ ok: true, doc });

    renderApp("/app");

    const row = await screen.findByText("Council tax reminder");
    fireEvent.click(row.closest("button") ?? row);

    expect(await screen.findByText("Ask AI about this document")).toBeInTheDocument();
  });

  it("renders global chat at /app/chat", async () => {
    mockDocCount = 1;
    renderApp("/app/chat");

    expect(await screen.findByText("PaperworkIQ Chat")).toBeInTheDocument();
    expect(screen.getByText("Search across your paperwork.")).toBeInTheDocument();
  });

  it("redirects /app/overview to /app", async () => {
    mockDocCount = 0;
    listDocuments.mockResolvedValue({ ok: true, docs: [] });

    renderApp("/app/overview");

    expect(await screen.findByText("Upload paperwork")).toBeInTheDocument();
    expect(screen.getByText("Inbox")).toBeInTheDocument();
  });

  it("renders simplified sidebar without overview or categories", async () => {
    mockDocCount = 0;
    listDocuments.mockResolvedValue({ ok: true, docs: [] });

    renderApp("/app");

    expect(await screen.findByText("Inbox")).toBeInTheDocument();
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
    expect(screen.queryByText("Categories")).not.toBeInTheDocument();
    expect(screen.queryByText("All documents")).not.toBeInTheDocument();
  });
});

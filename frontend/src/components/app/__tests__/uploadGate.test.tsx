import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import ChatHome from "@/pages/app/ChatHome";
import { EvidenceProvider } from "@/hooks/useEvidenceContext";
import { AppGateContext } from "@/hooks/useAppGate";

vi.mock("@/hooks/useChatSessions", () => ({
  useChatSessions: () => ({ sessions: [], startNewSession: vi.fn() }),
}));

vi.mock("@/hooks/useChatSession", () => ({
  useChatSession: () => ({ messages: [], setMessages: vi.fn() }),
}));

const renderWithProviders = ({ docCount }: { docCount: number }) => {
  const gateValue = {
    docCount,
    isLoading: false,
    error: null,
    refetchDocumentCount: vi.fn(),
    openUpload: vi.fn(),
    notifyUploadComplete: vi.fn(),
    uploadSignal: 0,
  };

  return render(
    <MemoryRouter>
      <AppGateContext.Provider value={gateValue}>
        <EvidenceProvider>
          <ChatHome />
        </EvidenceProvider>
      </AppGateContext.Provider>
    </MemoryRouter>
  );
};

describe("upload-first gating", () => {
  it("shows upload-first CTA and collapses evidence when docCount is 0", () => {
    renderWithProviders({ docCount: 0 });

    expect(screen.getByText("Upload your first document to get started.")).toBeInTheDocument();
    expect(screen.getByText("Upload a document")).toBeInTheDocument();
  });

  it("shows chat prompts and evidence details when docCount is greater than 0", () => {
    renderWithProviders({ docCount: 1 });

    expect(screen.getByText("Search across your paperwork.")).toBeInTheDocument();
  });
});

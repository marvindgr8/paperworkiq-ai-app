import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import ChatHome from "@/pages/app/ChatHome";
import EvidencePanel from "@/components/app/EvidencePanel";
import { EvidenceSelectionContext } from "@/hooks/useEvidenceSelection";
import { EvidenceContext } from "@/hooks/useEvidenceContext";
import { AppGateContext } from "@/hooks/useAppGate";
import { DocumentSelectionContext } from "@/hooks/useDocumentSelection";

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
  const evidenceValue = { selectedMessage: null, setSelectedMessage: vi.fn() };
  const documentValue = { selectedDocument: null, setSelectedDocument: vi.fn() };
  const evidenceContextValue = {
    mode: "full",
    sources: [],
    selectedSource: null,
    setSelectedSource: vi.fn(),
  };

  return render(
    <MemoryRouter>
      <AppGateContext.Provider value={gateValue}>
        <EvidenceSelectionContext.Provider value={evidenceValue}>
          <EvidenceContext.Provider value={evidenceContextValue}>
            <DocumentSelectionContext.Provider value={documentValue}>
              <div className="flex">
                <div className="flex-1">
                  <ChatHome />
                </div>
                <EvidencePanel />
              </div>
            </DocumentSelectionContext.Provider>
          </EvidenceContext.Provider>
        </EvidenceSelectionContext.Provider>
      </AppGateContext.Provider>
    </MemoryRouter>
  );
};

describe("upload-first gating", () => {
  it("shows upload-first CTA and collapses evidence when docCount is 0", () => {
    renderWithProviders({ docCount: 0 });

    expect(
      screen.getByText("Upload your first letter to get started.")
    ).toBeInTheDocument();
    expect(screen.getByText("Upload a document")).toBeInTheDocument();
    expect(screen.getByText("Waiting for your first upload")).toBeInTheDocument();
  });

  it("shows chat prompts and evidence details when docCount is greater than 0", () => {
    renderWithProviders({ docCount: 1 });

    expect(screen.getByText("Search across your paperwork.")).toBeInTheDocument();
    expect(screen.getByText("No cited sources yet.")).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import EvidenceDrawer from "@/components/app/EvidenceDrawer";
import MessageSources from "@/components/chat/MessageSources";
import { EvidenceProvider } from "@/hooks/useEvidenceContext";
import { DocumentSelectionContext } from "@/hooks/useDocumentSelection";
import type { Citation } from "@/types/chat";

const renderWithProviders = (citations: Citation[]) =>
  render(
    <EvidenceProvider>
      <DocumentSelectionContext.Provider
        value={{ selectedDocument: null, setSelectedDocument: () => undefined }}
      >
        <MessageSources citations={citations} />
        <EvidenceDrawer />
      </DocumentSelectionContext.Provider>
    </EvidenceProvider>
  );

describe("EvidenceDrawer", () => {
  it("opens from chat sources and lists citations", () => {
    const citations: Citation[] = [
      {
        documentId: "doc-1",
        documentTitle: "Council tax reminder",
        page: 2,
        snippet: "Payment due by April",
      },
      {
        documentId: "doc-2",
        documentTitle: "Energy bill",
        page: 1,
        snippet: "Balance due",
      },
    ];

    renderWithProviders(citations);

    const drawer = screen.getByTestId("evidence-drawer");
    expect(drawer).toHaveAttribute("data-state", "closed");

    fireEvent.click(screen.getByRole("button", { name: "View sources (2)" }));

    expect(drawer).toHaveAttribute("data-state", "open");
    expect(screen.getByText("Cited sources")).toBeInTheDocument();
    expect(screen.getByText("Council tax reminder")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(drawer).toHaveAttribute("data-state", "closed");
  });
});

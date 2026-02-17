import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DocumentPreview from "@/components/documents/DocumentPreview";
import type { DocumentDTO } from "@/lib/api";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    fetchDocumentPreviewUrl: vi.fn().mockResolvedValue("blob:preview"),
  };
});

describe("DocumentPreview", () => {
  it("renders a placeholder when no document is selected", () => {
    render(<DocumentPreview document={null} />);
    expect(screen.getByText("Select a document")).toBeInTheDocument();
  });

  it("renders header details for an image document", () => {
    const doc: DocumentDTO = {
      id: "doc-1",
      title: "Invoice",
      fileName: "invoice.png",
      mimeType: "image/png",
      status: "READY",
      createdAt: new Date().toISOString(),
      fields: [
        {
          id: "field-1",
          key: "Total",
          valueText: "$120",
        },
      ],
    };

    render(<DocumentPreview document={doc} />);

    expect(screen.getByText("Invoice")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("renders PDF preview for PDF documents", async () => {
    const doc: DocumentDTO = {
      id: "doc-2",
      title: "Statement",
      fileName: "statement.pdf",
      mimeType: "application/pdf",
      status: "READY",
      createdAt: new Date().toISOString(),
    };

    render(<DocumentPreview document={doc} />);

    await waitFor(() => {
      expect(screen.getByTitle("Document preview")).toBeInTheDocument();
    });
  });


  it("shows Ready badge when preview is available for a previously failed document", async () => {
    const doc: DocumentDTO = {
      id: "doc-4",
      title: "Recovered PDF",
      fileName: "recovered.pdf",
      mimeType: "application/pdf",
      status: "FAILED",
      createdAt: new Date().toISOString(),
      processingError: "Bad XRef entry",
    };

    render(<DocumentPreview document={doc} />);

    await waitFor(() => {
      expect(screen.getByText("Ready")).toBeInTheDocument();
    });

    expect(screen.queryByText("We couldn't read this PDF (bad XRef entry).")).not.toBeInTheDocument();
  });
  it("renders document iframe preview for supported office file types", async () => {
    const doc: DocumentDTO = {
      id: "doc-3",
      title: "Lease",
      fileName: "lease.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      status: "READY",
      createdAt: new Date().toISOString(),
    };

    render(<DocumentPreview document={doc} />);

    await waitFor(() => {
      expect(screen.getByTitle("Document preview")).toBeInTheDocument();
    });
  });
});

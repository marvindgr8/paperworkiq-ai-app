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

  it("renders extracted fields for an image document", () => {
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

    expect(screen.getByText("Extracted fields")).toBeInTheDocument();
    expect(screen.getByText("Key details found in this document")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$120")).toBeInTheDocument();
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
      expect(screen.getByTitle("PDF preview")).toBeInTheDocument();
    });
  });
});

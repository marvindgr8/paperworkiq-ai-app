import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DocumentPreview from "@/components/documents/DocumentPreview";
import type { DocumentDTO } from "@/lib/api";

vi.mock("react-pdf", () => ({
  Document: ({ children }: { children?: ReactNode }) => (
    <div>
      <div>PDF Mock</div>
      {children}
    </div>
  ),
  Page: ({ pageNumber }: { pageNumber: number }) => <div>Page {pageNumber}</div>,
  pdfjs: { GlobalWorkerOptions: { workerSrc: "" }, version: "0" },
}));

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
      fileUrl: "/uploads/invoice.png",
      status: "READY",
      createdAt: new Date().toISOString(),
      extractData: { fields: [{ key: "Total", valueText: "$120" }] },
    };

    render(<DocumentPreview document={doc} />);

    expect(screen.getByText("Extracted fields")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$120")).toBeInTheDocument();
  });

  it("renders PDF navigation for PDF documents", () => {
    const doc: DocumentDTO = {
      id: "doc-2",
      title: "Statement",
      fileName: "statement.pdf",
      mimeType: "application/pdf",
      fileUrl: "/uploads/statement.pdf",
      status: "READY",
      createdAt: new Date().toISOString(),
    };

    render(<DocumentPreview document={doc} />);

    expect(screen.getByText("PDF Mock")).toBeInTheDocument();
    expect(screen.getByText("Page 1")).toBeInTheDocument();
  });
});

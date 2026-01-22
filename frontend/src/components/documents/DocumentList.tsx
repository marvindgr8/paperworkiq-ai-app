import DocumentRow from "@/components/documents/DocumentRow";
import type { DocumentDTO } from "@/lib/api";

interface DocumentListProps {
  documents: DocumentDTO[];
  getCategory: (doc: DocumentDTO) => string | undefined;
  onSelect: (document: DocumentDTO) => void;
}

const DocumentList = ({ documents, getCategory, onSelect }: DocumentListProps) => {
  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <DocumentRow
          key={doc.id}
          document={doc}
          category={getCategory(doc)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

export default DocumentList;

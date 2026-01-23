import DocumentRow from "@/components/documents/DocumentRow";
import type { DocumentDTO } from "@/lib/api";

interface DocumentListProps {
  documents: DocumentDTO[];
  onSelect: (document: DocumentDTO) => void;
  onOpen?: (document: DocumentDTO) => void;
  onDelete?: (document: DocumentDTO) => void;
  onDownload?: (document: DocumentDTO) => void;
  duplicateHashes?: Set<string>;
}

const DocumentList = ({
  documents,
  onSelect,
  onOpen,
  onDelete,
  onDownload,
  duplicateHashes,
}: DocumentListProps) => {
  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <DocumentRow
          key={doc.id}
          document={doc}
          onSelect={onSelect}
          onOpen={onOpen}
          onDelete={onDelete}
          onDownload={onDownload}
          isDuplicate={Boolean(doc.fileHash && duplicateHashes?.has(doc.fileHash))}
        />
      ))}
    </div>
  );
};

export default DocumentList;

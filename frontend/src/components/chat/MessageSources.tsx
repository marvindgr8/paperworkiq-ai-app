import { buildEvidenceSources, useEvidenceContext } from "@/hooks/useEvidenceContext";
import type { Citation } from "@/types/chat";

interface MessageSourcesProps {
  citations?: Citation[];
}

const MessageSources = ({ citations }: MessageSourcesProps) => {
  const { openEvidence } = useEvidenceContext();

  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <button
      className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
      onClick={() => {
        const sources = buildEvidenceSources(citations);
        openEvidence({ sources });
      }}
      type="button"
    >
      View sources ({citations.length})
    </button>
  );
};

export default MessageSources;

import type { Citation } from "@/types/chat";

interface MessageSourcesProps {
  citations?: Citation[];
  onSelect: () => void;
}

const MessageSources = ({ citations, onSelect }: MessageSourcesProps) => {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <button
      className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
      onClick={onSelect}
      type="button"
    >
      Sources: {citations.length}
    </button>
  );
};

export default MessageSources;

import clsx from "clsx";
import MessageSources from "@/components/chat/MessageSources";
import type { ChatMessageDTO } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessageDTO;
  onSelectEvidence: (message: ChatMessageDTO) => void;
}

const MessageBubble = ({ message, onSelectEvidence }: MessageBubbleProps) => {
  const isAssistant = message.role === "ASSISTANT";

  return (
    <div className={clsx("flex", isAssistant ? "justify-start" : "justify-end")}>
      <div
        className={clsx(
          "max-w-[80%] rounded-[28px] px-4 py-3 text-sm shadow-sm",
          isAssistant
            ? "bg-white text-slate-800"
            : "bg-slate-900 text-white shadow-lg"
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {isAssistant ? (
          <MessageSources citations={message.citations} onSelect={() => onSelectEvidence(message)} />
        ) : null}
      </div>
    </div>
  );
};

export default MessageBubble;

import MessageBubble from "@/components/chat/MessageBubble";
import type { ChatMessageDTO } from "@/types/chat";

interface ChatThreadProps {
  messages: ChatMessageDTO[];
  onSelectEvidence: (message: ChatMessageDTO) => void;
}

const ChatThread = ({ messages, onSelectEvidence }: ChatThreadProps) => {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-6 py-6">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} onSelectEvidence={onSelectEvidence} />
      ))}
    </div>
  );
};

export default ChatThread;

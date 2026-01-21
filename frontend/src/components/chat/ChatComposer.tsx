import { useState } from "react";
import { Paperclip, Send } from "lucide-react";
import Button from "@/components/ui/Button";

interface ChatComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const ChatComposer = ({ onSend, disabled }: ChatComposerProps) => {
  const [value, setValue] = useState("");

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className="border-t border-zinc-200/70 bg-white/90 px-6 py-4">
      <div className="flex items-center gap-3 rounded-[28px] border border-zinc-200/70 bg-white px-4 py-3 shadow-sm">
        <button className="text-slate-400" type="button">
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          placeholder="Ask about a letter, a due date, or a reference number..."
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          className="rounded-full"
          size="sm"
          onClick={handleSend}
          disabled={disabled}
        >
          <Send className="mr-2 h-4 w-4" />
          Send
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Responses are grounded in your uploaded paperwork only.
      </p>
    </div>
  );
};

export default ChatComposer;

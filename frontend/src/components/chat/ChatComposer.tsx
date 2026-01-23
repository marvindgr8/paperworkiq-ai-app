import { useEffect, useRef, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import Button from "@/components/ui/Button";

interface ChatComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  helperText?: string;
  autoFocus?: boolean;
}

const ChatComposer = ({ onSend, disabled, helperText, autoFocus }: ChatComposerProps) => {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (disabled) {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onSend(trimmed);
    setValue("");
  };

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  return (
    <div className="border-t border-zinc-200/70 bg-white/90 px-6 py-4">
      <div className="flex items-center gap-3 rounded-[28px] border border-zinc-200/70 bg-white px-4 py-3 shadow-sm">
        <button className="text-slate-400" type="button" disabled={disabled}>
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          placeholder="Ask AI about your documents…"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled}
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
        {helperText ?? "Responses are grounded in your uploaded documents only."}
      </p>
    </div>
  );
};

export default ChatComposer;

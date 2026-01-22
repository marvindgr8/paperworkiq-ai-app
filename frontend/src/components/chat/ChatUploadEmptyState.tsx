import { useState } from "react";
import Button from "@/components/ui/Button";
import { useAppGate } from "@/hooks/useAppGate";

const examplePrompts = [
  "When is my council tax due?",
  "Summarise my latest energy bill.",
  "Find documents that need action.",
];

const ChatUploadEmptyState = () => {
  const { openUpload } = useAppGate();
  const [showExamples, setShowExamples] = useState(false);

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="max-w-xl space-y-6">
        <h1 className="text-3xl font-semibold text-slate-900">
          Upload your first document to get started.
        </h1>
        <p className="text-sm text-slate-500">
          PaperworkIQ only answers using your uploaded paperwork — with citations.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={openUpload}>
            Upload a document
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setShowExamples((prev) => !prev)}
          >
            {showExamples ? "Hide examples" : "See examples"}
          </Button>
        </div>
        {showExamples ? (
          <div className="flex flex-wrap justify-center gap-3">
            {examplePrompts.map((prompt) => (
              <span
                key={prompt}
                className="rounded-full border border-zinc-200/70 bg-white px-4 py-2 text-xs text-slate-600 shadow-sm"
              >
                {prompt}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ChatUploadEmptyState;

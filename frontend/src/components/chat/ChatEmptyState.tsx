const prompts = [
  "When is my council tax due?",
  "Find documents that need action.",
  "Summarise my latest energy bill.",
  "What’s this reference number about: CTX-1182?",
];

const ChatEmptyState = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="max-w-xl space-y-6">
        <h1 className="text-3xl font-semibold text-slate-900">Search across your paperwork.</h1>
        <p className="text-sm text-slate-500">
          Ask a question and PaperworkIQ will surface the exact documents, pages, and passages
          behind the answer.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {prompts.map((prompt) => (
            <span
              key={prompt}
              className="rounded-full border border-zinc-200/70 bg-white px-4 py-2 text-xs text-slate-600 shadow-sm"
            >
              {prompt}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatEmptyState;

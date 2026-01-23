const prompts = [
  "What is the due date on my latest notice?",
  "Find documents that need action.",
  "Summarise the most recent statement.",
  "What’s this reference number about: INV-1182?",
];

const ChatEmptyState = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="max-w-xl space-y-6">
        <h1 className="text-3xl font-semibold text-slate-900">Search across your documents.</h1>
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

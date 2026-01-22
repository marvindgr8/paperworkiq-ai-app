import Button from "@/components/ui/Button";
import { useAppGate } from "@/hooks/useAppGate";
import { useNavigate } from "react-router-dom";

const OverviewPage = () => {
  const { docCount, isLoading, openUpload } = useAppGate();
  const navigate = useNavigate();
  const uploadFirst = !isLoading && docCount === 0;
  const inboxCountLabel = isLoading
    ? "— documents"
    : uploadFirst
      ? "0 documents"
      : `${docCount} documents`;
  const inboxSubtitle = uploadFirst
    ? "Upload to start tracking your paperwork."
    : "Latest upload: Council tax reminder";
  const actionCountLabel = isLoading ? "— actions" : uploadFirst ? "0 actions" : "4 actions";
  const actionSubtitle = uploadFirst
    ? "We’ll highlight deadlines once documents arrive."
    : "Review these this week";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200/70 bg-white/80 px-6 py-5">
        <h1 className="text-lg font-semibold text-slate-900">Overview</h1>
        <p className="text-xs text-slate-500">A snapshot of your document workspace.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-[32px] border border-zinc-200/70 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              {uploadFirst ? "Welcome to PaperworkIQ" : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {uploadFirst
                ? "Upload your first letter so we can surface action items and cited answers."
                : "This area will host your document workspace. For now, explore the chat-led experience and keep your paperwork flowing in."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button size="lg" variant="outline" onClick={openUpload}>
                Upload a document
              </Button>
              <Button size="lg" onClick={() => navigate("/app/chat")}>
                Start a chat
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-zinc-200/70 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Inbox</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{inboxCountLabel}</p>
              <p className="text-xs text-slate-500">{inboxSubtitle}</p>
            </div>
            <div className="rounded-[28px] border border-zinc-200/70 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Needs attention</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{actionCountLabel}</p>
              <p className="text-xs text-slate-500">{actionSubtitle}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;

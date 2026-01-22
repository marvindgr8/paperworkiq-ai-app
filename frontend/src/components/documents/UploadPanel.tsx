import { UploadCloud } from "lucide-react";
import Button from "@/components/ui/Button";
import { useAppGate } from "@/hooks/useAppGate";

const UploadPanel = () => {
  const { openUpload } = useAppGate();

  return (
    <section className="rounded-[32px] border border-dashed border-zinc-200/70 bg-white px-8 py-10 shadow-sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/5">
          <UploadCloud className="h-6 w-6 text-slate-700" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">Upload paperwork</h2>
          <p className="text-sm text-slate-500">
            Drop PDFs, scans, or photos here. We’ll organize and prep them for AI answers with
            citations.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" onClick={openUpload}>
            Choose files
          </Button>
          <span className="text-xs text-slate-400">or drag and drop</span>
        </div>
      </div>
    </section>
  );
};

export default UploadPanel;

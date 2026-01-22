import Button from "@/components/ui/Button";
import { useAppGate } from "@/hooks/useAppGate";

interface UploadFirstEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
}

const UploadFirstEmptyState = ({
  title,
  description,
  actionLabel = "Upload a document",
}: UploadFirstEmptyStateProps) => {
  const { openUpload } = useAppGate();

  return (
    <div className="rounded-[28px] border border-dashed border-zinc-200/70 bg-zinc-50/70 px-6 py-10 text-center">
      <div className="mx-auto max-w-md space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
        <Button size="lg" onClick={openUpload}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
};

export default UploadFirstEmptyState;

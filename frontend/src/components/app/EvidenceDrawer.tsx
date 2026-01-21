import clsx from "clsx";
import EvidencePanel from "@/components/app/EvidencePanel";

interface EvidenceDrawerProps {
  open: boolean;
  onClose: () => void;
}

const EvidenceDrawer = ({ open, onClose }: EvidenceDrawerProps) => {
  return (
    <div
      className={clsx(
        "fixed inset-0 z-40 flex lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      <button
        className={clsx(
          "absolute inset-0 bg-black/30 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        type="button"
      />
      <div
        className={clsx(
          "relative ml-auto h-full w-full max-w-md transform bg-white shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-200/70 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">Evidence</p>
          <button className="text-xs font-medium text-slate-500" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="h-full overflow-y-auto">
          <EvidencePanel className="w-full border-l-0" />
        </div>
      </div>
    </div>
  );
};

export default EvidenceDrawer;

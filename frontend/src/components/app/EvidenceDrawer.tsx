import clsx from "clsx";
import EvidencePanel from "@/components/app/EvidencePanel";
import { useEvidenceContext } from "@/hooks/useEvidenceContext";

const EvidenceDrawer = () => {
  const { isOpen, closeEvidence } = useEvidenceContext();
  return (
    <div
      className={clsx(
        "fixed inset-0 z-40 flex items-end justify-end lg:items-stretch",
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      )}
      data-state={isOpen ? "open" : "closed"}
      data-testid="evidence-drawer"
    >
      <button
        className={clsx(
          "absolute inset-0 bg-black/30 transition-opacity",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={closeEvidence}
        type="button"
      />
      <div
        className={clsx(
          "relative w-full max-w-full transform bg-white shadow-2xl transition-transform duration-300 lg:ml-auto lg:h-full lg:w-[480px]",
          isOpen ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-x-full",
          "rounded-t-[32px] lg:rounded-none"
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-200/70 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">Evidence</p>
          <button
            className="text-xs font-medium text-slate-500"
            onClick={closeEvidence}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="h-[75vh] overflow-y-auto lg:h-full">
          <EvidencePanel className="w-full border-l-0" />
        </div>
      </div>
    </div>
  );
};

export default EvidenceDrawer;

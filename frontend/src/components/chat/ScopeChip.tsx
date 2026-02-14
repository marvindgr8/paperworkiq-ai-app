import type { HomeChatScopePayload } from "@/lib/api";

interface ScopeChipProps {
  scope: HomeChatScopePayload;
  currentFolderName: string;
}

const ScopeChip = ({ scope, currentFolderName }: ScopeChipProps) => {
  const label =
    scope.scopeType === "selection"
      ? `Scope: ${scope.fileIds.length + scope.folderIds.length} selected`
      : `Scope: ${scope.rootFolderId ? currentFolderName : "Root"}`;

  return (
    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {label}
    </div>
  );
};

export default ScopeChip;

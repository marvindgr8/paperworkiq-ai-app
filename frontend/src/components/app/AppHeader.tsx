import type { ReactNode } from "react";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

const AppHeader = ({ title, subtitle, actions }: AppHeaderProps) => {
  return (
    <div className="border-b border-zinc-200/70 bg-white/80 px-6 py-5">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
};

export default AppHeader;

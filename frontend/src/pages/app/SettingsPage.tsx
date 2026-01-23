import AppHeader from "@/components/app/AppHeader";

const SettingsPage = () => {
  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="Settings"
        subtitle="Personalize your PaperworkIQ experience."
      />
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="rounded-[28px] border border-dashed border-zinc-200/70 bg-zinc-50/70 px-6 py-10 text-center text-sm text-slate-500">
          Settings are coming soon.
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

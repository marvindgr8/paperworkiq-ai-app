import Button from "@/components/ui/Button";

const Teams = () => {
  return (
    <div className="min-h-screen bg-white px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          For teams
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Teams is coming soon.</h1>
        <p className="text-slate-600">
          PaperworkIQ will support shared workspaces, access controls, and audit trails for families
          and companies that need to collaborate.
        </p>
        <Button href="/signup" size="lg">
          Get early access
        </Button>
      </div>
    </div>
  );
};

export default Teams;

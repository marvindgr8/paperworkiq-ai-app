import Button from "@/components/ui/Button";

const Teams = () => {
  return (
    <div className="min-h-screen bg-white px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          For teams
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Sharing is live. Team Workspaces are next.</h1>
        <p className="text-slate-600">
          You can now share individual files and folders today. Team Workspaces, granular access
          controls, and audit trails are coming next for families and companies that collaborate.
        </p>
        <Button href="/signup" size="lg">
          Join the waitlist for Team Workspaces
        </Button>
      </div>
    </div>
  );
};

export default Teams;

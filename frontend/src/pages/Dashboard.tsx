import Button from "@/components/ui/Button";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-white px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">
          This area will host your document workspace. For now, explore the homepage design.
        </p>
        <Button size="lg" variant="outline">
          Back to homepage
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;

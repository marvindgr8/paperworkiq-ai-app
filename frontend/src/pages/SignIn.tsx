import Button from "@/components/ui/Button";

const SignIn = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Authentication UI is coming soon. Use the API placeholders for now.
        </p>
        <Button className="mt-6 w-full" size="lg">
          Continue
        </Button>
      </div>
    </div>
  );
};

export default SignIn;

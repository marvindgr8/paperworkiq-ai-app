import { Link } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const SignIn = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Sign in to PaperworkIQ</h1>
          <p className="text-sm text-slate-600">
            Welcome back. Enter your credentials to review your documents.
          </p>
        </div>
        <form className="mt-8 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Work email
            </label>
            <Input id="email" placeholder="you@company.com" type="email" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <Input id="password" placeholder="Enter your password" type="password" />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <label className="flex items-center gap-2">
              <input className="h-4 w-4 rounded border-slate-300" type="checkbox" />
              Keep me signed in
            </label>
            <Link className="font-medium text-slate-700 hover:text-slate-900" to="/signup">
              Need access?
            </Link>
          </div>
          <Button className="w-full" size="lg" type="submit">
            Sign in
          </Button>
        </form>
        <div className="mt-8 border-t border-slate-100 pt-6 text-sm text-slate-500">
          <span>New to PaperworkIQ?</span>{" "}
          <Link className="font-medium text-slate-900 hover:text-slate-700" to="/signup">
            Get early access
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignIn;

import { Link } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const SignUp = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16">
      <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Early access
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">Get early access to PaperworkIQ</h1>
          <p className="text-sm text-slate-600">
            Create your personal workspace and be first to try PaperworkIQ.
          </p>
        </div>
        <form className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="full-name">
              Full name (optional)
            </label>
            <Input id="full-name" placeholder="Alex Morgan" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <Input id="email" placeholder="alex@email.com" type="email" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <Input id="password" placeholder="Create a password" type="password" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="organizing">
              What are you organizing? (optional)
            </label>
            <select
              id="organizing"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100"
              defaultValue=""
            >
              <option value="" disabled>
                Select one
              </option>
              <option value="household-letters">Household letters</option>
              <option value="bills">Bills</option>
              <option value="medical">Medical</option>
              <option value="everything">Everything</option>
            </select>
          </div>
          <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              By continuing, you agree to receive product updates from PaperworkIQ.
            </p>
            <Button className="w-full sm:w-auto" size="lg" type="submit">
              Get early access
            </Button>
          </div>
        </form>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6 text-sm text-slate-500">
          <span>Already have access?</span>
          <Link className="font-medium text-slate-900 hover:text-slate-700" to="/signin">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;

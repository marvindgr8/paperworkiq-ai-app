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
            Tell us about your workflow and we’ll reserve a spot in the private pilot.
          </p>
        </div>
        <form className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="full-name">
              Full name
            </label>
            <Input id="full-name" placeholder="Alex Morgan" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="work-email">
              Work email
            </label>
            <Input id="work-email" placeholder="alex@company.com" type="email" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="company-name">
              Company
            </label>
            <Input id="company-name" placeholder="PaperworkIQ Labs" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="role">
              Role
            </label>
            <Input id="role" placeholder="Operations Lead" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="volume">
              Monthly document volume
            </label>
            <Input id="volume" placeholder="Approx. 2,000 files" />
          </div>
          <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              By continuing, you agree to receive product updates from PaperworkIQ.
            </p>
            <Button className="w-full sm:w-auto" size="lg" type="submit">
              Request early access
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

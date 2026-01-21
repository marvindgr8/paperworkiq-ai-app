import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles, Files, Gauge, Lock } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Separator from "@/components/ui/Separator";

const Homepage = () => {
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white">
              PI
            </span>
            PaperworkIQ
          </div>
          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <a className="hover:text-slate-900" href="#features">
              Features
            </a>
            <a className="hover:text-slate-900" href="#workflow">
              Workflow
            </a>
            <a className="hover:text-slate-900" href="#security">
              Security
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button href="/signin" variant="ghost" size="sm">
              Sign in
            </Button>
            <Button href="/signup" size="sm">
              Get early access
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#f1f5f9,_transparent_60%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-16 px-6 pb-20 pt-16 md:grid-cols-[1.1fr_0.9fr] md:pt-24">
            <div className="space-y-8">
              <Badge>AI-ready document intelligence</Badge>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-4xl font-semibold leading-tight text-slate-900 md:text-5xl"
              >
                PaperworkIQ turns messy paperwork into calm, searchable clarity.
              </motion.h1>
              <p className="text-lg text-slate-600">
                Collect, organize, and extract insights from documents with an Apple-premium experience
                built for modern operations teams.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button href="/signup" size="lg">
                  Get early access <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button href="/signin" size="lg" variant="outline">
                  Sign in
                </Button>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-900" /> SOC2-ready foundation
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-slate-900" /> AI extraction coming soon
                </div>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">Ingest queue</p>
                  <Badge className="bg-slate-900 text-white">Live</Badge>
                </div>
                <div className="space-y-4">
                  {["Invoice_0412.pdf", "Lease-Agreement.docx", "Policy_Update.pdf"].map(
                    (file) => (
                      <div
                        key={file}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{file}</p>
                          <p className="text-xs text-slate-500">Ready for extraction</p>
                        </div>
                <Button size="sm" variant="outline">
                  Review
                </Button>
                      </div>
                    )
                  )}
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Summary
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-semibold text-slate-900">128</p>
                      <p className="text-xs text-slate-500">Docs processed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-slate-900">4.9/5</p>
                      <p className="text-xs text-slate-500">Accuracy score</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge>Designed for speed</Badge>
              <h2 className="mt-4 text-3xl font-semibold text-slate-900">
                Everything you need to orchestrate paperwork.
              </h2>
            </div>
            <p className="max-w-xl text-slate-600">
              PaperworkIQ centralizes documents, metadata, and extraction-ready workflows so your team
              never loses track of what matters.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Unified intake",
                description: "Capture PDFs, scans, and forms with metadata ready for extraction.",
                icon: Files,
              },
              {
                title: "Precision-ready",
                description: "Schema-first storage keeps every field mapped and auditable.",
                icon: Gauge,
              },
              {
                title: "Security built-in",
                description: "Granular permissions, audit trails, and privacy-first storage.",
                icon: Lock,
              },
            ].map((feature) => (
              <Card key={feature.title} className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section id="workflow" className="bg-slate-50">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Badge>Workflow</Badge>
              <h2 className="text-3xl font-semibold text-slate-900">
                A calm pipeline from upload to insight.
              </h2>
              <p className="text-slate-600">
                PaperworkIQ tracks every step: intake, validation, extraction, and review. Give your
                team the visibility they need without the chaos.
              </p>
              <div className="grid gap-4">
                {[
                  "Invite stakeholders and collect documents",
                  "Auto-tag files and apply extraction templates",
                  "Review results with citations and confidence",
                ].map((step, index) => (
                  <div key={step} className="flex items-start gap-4">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700">
                      0{index + 1}
                    </div>
                    <p className="text-sm text-slate-600">{step}</p>
                  </div>
                ))}
              </div>
            </div>
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Latest activity</p>
                <Button size="sm" variant="secondary">
                  View all
                </Button>
              </div>
              {["Tenant application", "Vendor contract", "Renewal addendum"].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-sm font-medium text-slate-900">{item}</p>
                  <p className="text-xs text-slate-500">Extraction queued · 2 min ago</p>
                </div>
              ))}
            </Card>
          </div>
        </section>

        <section id="security" className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
            <Card className="space-y-4">
              <Badge>Security</Badge>
              <h3 className="text-2xl font-semibold text-slate-900">
                Enterprise-grade protection from day one.
              </h3>
              <p className="text-sm text-slate-600">
                Built with secure storage, scoped access, and audit-ready logging so you can scale
                confidently.
              </p>
              <div className="space-y-3">
                {["Encrypted at rest", "Role-based access", "Private-by-default projects"].map(
                  (item) => (
                    <div key={item} className="flex items-center gap-3 text-sm text-slate-600">
                      <ShieldCheck className="h-4 w-4 text-slate-900" /> {item}
                    </div>
                  )
                )}
              </div>
            </Card>
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-slate-900">Stay ahead of every file.</h3>
              <p className="text-slate-600">
                Sign up for updates as we roll out uploads, OCR, and AI extraction automation.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input placeholder="you@company.com" type="email" />
                <Button href="/signup" size="lg">
                  Get early access
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                We respect your inbox. No spam, just launch updates.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500 md:flex-row">
          <p>© 2025 PaperworkIQ. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a className="hover:text-slate-900" href="/signin">
              Sign in
            </a>
            <a className="hover:text-slate-900" href="/signup">
              Get early access
            </a>
            <a className="hover:text-slate-900" href="#features">
              Features
            </a>
            <a className="hover:text-slate-900" href="#security">
              Security
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;

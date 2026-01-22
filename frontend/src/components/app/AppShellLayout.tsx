import { useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu, Sparkles } from "lucide-react";
import AppSidebar from "@/components/app/AppSidebar";
import EvidenceDrawer from "@/components/app/EvidenceDrawer";
import { DocumentSelectionContext } from "@/hooks/useDocumentSelection";
import { AppGateContext } from "@/hooks/useAppGate";
import { useDocumentCount } from "@/hooks/useDocumentCount";
import UploadModal from "@/components/uploads/UploadModal";
import type { DocumentDTO } from "@/lib/api";
import { EvidenceProvider } from "@/hooks/useEvidenceContext";
import clsx from "clsx";

const AppShellLayout = () => {
  const navigate = useNavigate();
  const [selectedDocument, setSelectedDocument] = useState<DocumentDTO | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSignal, setUploadSignal] = useState(0);
  const { count, isLoading, error, refetch } = useDocumentCount();

  const documentContextValue = useMemo(
    () => ({ selectedDocument, setSelectedDocument }),
    [selectedDocument]
  );

  const gateContextValue = useMemo(
    () => ({
      docCount: count,
      isLoading,
      error,
      refetchDocumentCount: refetch,
      openUpload: () => setUploadOpen(true),
      notifyUploadComplete: () => setUploadSignal((prev) => prev + 1),
      uploadSignal,
    }),
    [count, isLoading, error, refetch, uploadSignal]
  );

  const handleNewChat = () => {
    navigate("/app/chat?new=1");
    setSidebarOpen(false);
  };

  const handleUploaded = async () => {
    await refetch();
    setUploadSignal((prev) => prev + 1);
  };

  return (
    <AppGateContext.Provider value={gateContextValue}>
      <EvidenceProvider>
        <DocumentSelectionContext.Provider value={documentContextValue}>
          <div className="min-h-screen bg-gradient-to-br from-white via-white to-zinc-50">
            <div className="flex h-screen w-full overflow-hidden">
              <div className="hidden h-full lg:flex">
                <AppSidebar onNewChat={handleNewChat} />
              </div>

              <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-between border-b border-zinc-200/70 bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
                  <button
                    className="rounded-xl border border-zinc-200/70 p-2 text-slate-600"
                    onClick={() => setSidebarOpen(true)}
                    type="button"
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Sparkles className="h-4 w-4 text-slate-500" />
                    PaperworkIQ
                  </div>
                  <span className="h-9 w-9" />
                </div>
                <main className="flex-1 overflow-hidden">
                  <Outlet />
                </main>
              </div>
            </div>

            <EvidenceDrawer />
            <UploadModal
              open={uploadOpen}
              onClose={() => setUploadOpen(false)}
              onUploaded={handleUploaded}
            />

            <div
              className={clsx(
                "fixed inset-0 z-40 flex lg:hidden",
                sidebarOpen ? "pointer-events-auto" : "pointer-events-none"
              )}
            >
              <button
                className={clsx(
                  "absolute inset-0 bg-black/30 transition-opacity",
                  sidebarOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={() => setSidebarOpen(false)}
                type="button"
              />
              <div
                className={clsx(
                  "relative h-full w-full max-w-xs transform bg-zinc-50 shadow-2xl transition-transform",
                  sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
              >
                <AppSidebar onNewChat={handleNewChat} />
              </div>
            </div>
          </div>
        </DocumentSelectionContext.Provider>
      </EvidenceProvider>
    </AppGateContext.Provider>
  );
};

export default AppShellLayout;

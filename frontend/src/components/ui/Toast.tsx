interface ToastProps {
  message: string;
  onDismiss: () => void;
}

const Toast = ({ message, onDismiss }: ToastProps) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg">
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button
          type="button"
          className="text-xs font-semibold text-slate-400 hover:text-slate-600"
          onClick={onDismiss}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Toast;

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = nextId++;
      setItems((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    show,
    success: (m) => show(m, "success"),
    error: (m) => show(m, "error"),
    info: (m) => show(m, "info"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {items.map((t) => {
          const styles =
            t.variant === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : t.variant === "error"
                ? "bg-rose-50 border-rose-300 text-rose-800"
                : "bg-sky-50 border-sky-300 text-sky-800";
          const Icon = t.variant === "success" ? CheckCircle2 : t.variant === "error" ? AlertCircle : Info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 rounded-xl border-2 px-4 py-3 shadow-lg animate-in slide-in-from-right ${styles}`}
              style={{ minWidth: 280, maxWidth: 420 }}
              role="status"
            >
              <Icon size={18} className="shrink-0" />
              <p className="flex-1 text-sm font-semibold">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded p-1 opacity-50 hover:opacity-100"
                aria-label="�óng"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback no-op khi thiếu provider (vd. trang public)
    return {
      show: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { Toast, useToastStore } from "./toast.store";
import "./Toast.css";

const variantIcons = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  danger: XCircle,
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = variantIcons[toast.variant];

  useEffect(() => {
    const id = window.setTimeout(onDismiss, toast.duration);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timer runs once per toast
  }, []);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="toast"
      data-variant={toast.variant}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      layout
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
    >
      <span className="toast__icon">
        <Icon size={17} />
      </span>
      <div className="toast__body">
        <strong>{toast.title}</strong>
        {toast.description ? <p>{toast.description}</p> : null}
      </div>
      {toast.actionLabel && toast.onAction ? (
        <button
          className="toast__action"
          onClick={() => {
            toast.onAction?.();
            onDismiss();
          }}
          type="button"
        >
          {toast.actionLabel}
        </button>
      ) : null}
      <button aria-label="Dismiss notification" className="toast__close" onClick={onDismiss} type="button">
        <X size={14} />
      </button>
    </motion.div>
  );
}

/** Bottom-right notification stack. Mount once at the app root. */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  return createPortal(
    <div aria-label="Notifications" aria-live="polite" className="toaster" role="region">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "../Button/Button";
import "./ConfirmModal.css";

type ConfirmModalProps = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Small decision dialog — Escape/backdrop cancel, primary action confirms. */
export function ConfirmModal({ title, description, confirmLabel, cancelLabel = "Cancel", onCancel, onConfirm }: ConfirmModalProps) {
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return createPortal(
    <div className="modal-backdrop" onMouseDown={onCancel} role="presentation">
      <section aria-label={title} aria-modal="true" className="auth-card confirm-card" onMouseDown={(event) => event.stopPropagation()} role="alertdialog">
        <h2>{title}</h2>
        <p className="muted">{description}</p>
        <footer>
          <Button onClick={onCancel} type="button" variant="ghost">
            {cancelLabel}
          </Button>
          <Button autoFocus onClick={onConfirm} type="button">
            {confirmLabel}
          </Button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

import { nanoid } from "nanoid";
import { create } from "zustand";

export type ToastVariant = "success" | "info" | "warning" | "danger";

export type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
};

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
};

type ToastStore = {
  toasts: Toast[];
  showToast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (input) => {
    const toast: Toast = {
      id: nanoid(),
      variant: "info",
      // Undo-able toasts linger longer so the safety net is real.
      duration: input.actionLabel ? 6_000 : 3_800,
      ...input,
    };

    set((state) => ({ toasts: [...state.toasts, toast].slice(-3) }));
    return toast.id;
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

/** Imperative helper so plain handlers can fire toasts without hooks. */
export function showToast(input: ToastInput) {
  return useToastStore.getState().showToast(input);
}

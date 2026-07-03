import { create } from "zustand";

/** Top-level sections reachable from the sidebar / account menu. */
export type ShellView =
  | "chat"
  | "quests"
  | "shop"
  | "season"
  | "ranking"
  | "library"
  | "profile"
  | "settings"
  | "plans"
  | "activity"
  | "stats"
  | "earn"
  | "gallery";

type ShellStore = {
  /** Which section is currently rendered in the main stage. */
  view: ShellView;
  /** Transient confirmation/error line shown under the active panel. */
  actionMessage: string;
  setView: (view: ShellView) => void;
  setActionMessage: (message: string) => void;
};

/**
 * Ephemeral app-shell UI state shared across the sidebar and every view.
 * Domain data stays in its own stores (chat, account, theme); this store only
 * owns navigation and the transient action message so views can be extracted
 * from ChatPage without prop-drilling.
 */
export const useShellStore = create<ShellStore>((set) => ({
  view: "chat",
  actionMessage: "",
  setView: (view) => set({ view }),
  setActionMessage: (actionMessage) => set({ actionMessage }),
}));

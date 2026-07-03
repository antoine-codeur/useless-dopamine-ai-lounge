import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CreditSource = "prompt" | "quest" | "booster" | "combo" | "purchase" | "refund" | "plan" | "gift" | "season";

export type CreditEntry = {
  id: string;
  at: string;
  /** Positive = earned, negative = spent. */
  delta: number;
  /** Human line — "Booster opening", "Quest: Send 25 messages"… */
  reason: string;
  source: CreditSource;
};

type LedgerStore = {
  entries: CreditEntry[];
  record: (delta: number, reason: string, source: CreditSource) => void;
};

/**
 * Every credit movement the client knows about — which is all of them, since
 * both optimistic spends and backend responses land here. Feeds the Stats page.
 */
export const useLedgerStore = create<LedgerStore>()(
  persist(
    (set) => ({
      entries: [],
      record: (delta, reason, source) => {
        if (delta === 0) {
          return;
        }

        set((state) => ({
          entries: [{ id: nanoid(), at: new Date().toISOString(), delta, reason, source }, ...state.entries].slice(0, 300),
        }));
      },
    }),
    { name: "uda:ledger" },
  ),
);

/** Imperative helper so plain handlers can record without hooks. */
export function recordCredit(delta: number, reason: string, source: CreditSource) {
  useLedgerStore.getState().record(delta, reason, source);
}

/** Net credits per source, for the Stats summary chips. */
export function totalsBySource(entries: CreditEntry[]): { source: CreditSource; total: number }[] {
  const totals = new Map<CreditSource, number>();
  entries.forEach((entry) => totals.set(entry.source, (totals.get(entry.source) ?? 0) + entry.delta));
  return [...totals.entries()].map(([source, total]) => ({ source, total })).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

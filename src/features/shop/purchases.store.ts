import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** LoL-style safety net: three refunds per account, ever. */
export const REFUND_LIMIT = 3;

export type PurchaseKind = "theme" | "polarized" | "persona" | "booster" | "season";

export type Purchase = {
  id: string;
  at: string;
  kind: PurchaseKind;
  /** What was bought — theme id, persona id, or "booster". */
  refId: string;
  label: string;
  price: number;
  /** Boosters only: how many the pack contained. */
  count?: number;
  /** false = never refundable (season pass). Default: eligible. */
  refundable?: boolean;
  refundedAt?: string;
};

type PurchasesStore = {
  purchases: Purchase[];
  refundsUsed: number;
  record: (input: Omit<Purchase, "id" | "at">) => void;
  markRefunded: (id: string) => void;
};

export const usePurchasesStore = create<PurchasesStore>()(
  persist(
    (set) => ({
      purchases: [],
      refundsUsed: 0,
      record: (input) =>
        set((state) => ({
          purchases: [{ id: nanoid(), at: new Date().toISOString(), ...input }, ...state.purchases].slice(0, 200),
        })),
      markRefunded: (id) =>
        set((state) => ({
          purchases: state.purchases.map((purchase) => (purchase.id === id ? { ...purchase, refundedAt: new Date().toISOString() } : purchase)),
          refundsUsed: state.refundsUsed + 1,
        })),
    }),
    { name: "uda:purchases" },
  ),
);

/** Imperative helper so buy handlers can record without hooks. */
export function recordPurchase(input: Omit<Purchase, "id" | "at">) {
  usePurchasesStore.getState().record(input);
}

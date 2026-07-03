import { create } from "zustand";
import { useAccountStore } from "../profile/account.store";
import { bumpQuest } from "../quests/quest.store";
import { recordCredit } from "../stats/ledger.store";
import { boostGain } from "../../lib/planPerks";

export type CreditCombo = {
  id: number;
  /** Accumulated credits shown while the notification lives. */
  total: number;
  /** How many gains landed while it was open — drives the frenzy colors. */
  combo: number;
  multiplied: boolean;
};

export type ComboBonus = { id: number; amount: number; comboCount: number };

type CreditComboStore = {
  combo: CreditCombo | null;
  /** Phase 2: the combo converts into bonus credits. */
  bonus: ComboBonus | null;
  addGain: (amount: number) => void;
  finishCombo: () => void;
  clearBonus: () => void;
  clear: () => void;
};

/** Combo score → credits: (combo − 1) × 10 (a lone gain earns no bonus). */
export function comboBonusFor(comboCount: number) {
  return Math.max(0, (comboCount - 1) * 10);
}

/** Chance to double the whole combo once it reaches x2 or more. */
const MULTIPLIER_CHANCE = 0.25;

let comboSeq = 0;

export const useCreditComboStore = create<CreditComboStore>((set, get) => ({
  combo: null,
  bonus: null,
  finishCombo: () => {
    const current = get().combo;

    if (!current) {
      return;
    }

    // Paid plans boost combo payouts too (Pro +5%, Max +10%, Max+ +20%).
    const amount = boostGain(comboBonusFor(current.combo), useAccountStore.getState().account?.plan);

    if (amount <= 0) {
      set({ combo: null });
      return;
    }

    // Credit the combo score for real (direct — must NOT restart the combo).
    const accountStore = useAccountStore.getState();

    if (accountStore.account) {
      accountStore.setAccount(
        { ...accountStore.account, creditsRemaining: accountStore.account.creditsRemaining + amount },
        accountStore.plans,
        accountStore.quests,
      );
    }

    bumpQuest("credits-earned", amount);
    recordCredit(amount, `Combo ×${current.combo} bonus`, "combo");
    set({ combo: null, bonus: { id: ++comboSeq, amount, comboCount: current.combo } });
  },
  clearBonus: () => set({ bonus: null }),
  addGain: (amount) => {
    if (amount <= 0) {
      return;
    }

    const current = get().combo;

    if (!current) {
      set({ combo: { id: ++comboSeq, total: amount, combo: 1, multiplied: false } });
      return;
    }

    let total = current.total + amount;
    let multiplied = current.multiplied;
    const combo = current.combo + 1;

    // Combo ≥ 2: roll the jackpot — the WHOLE combo doubles, credited for real.
    if (!multiplied && combo >= 2 && Math.random() < MULTIPLIER_CHANCE) {
      multiplied = true;
      const bonus = boostGain(total, useAccountStore.getState().account?.plan);
      const accountStore = useAccountStore.getState();

      if (accountStore.account) {
        accountStore.setAccount(
          { ...accountStore.account, creditsRemaining: accountStore.account.creditsRemaining + bonus },
          accountStore.plans,
          accountStore.quests,
        );
      }

      bumpQuest("credits-earned", bonus);
      recordCredit(bonus, "Combo jackpot ×2", "combo");
      total += bonus;
    }

    set({ combo: { id: current.id, total, combo, multiplied } });
  },
  clear: () => set({ combo: null }),
}));

/** Call this everywhere credits are gained — the toast accumulates them. */
export function creditGain(amount: number) {
  useCreditComboStore.getState().addGain(amount);
}

import { create } from "zustand";
import type { Account, Plan, Quest } from "../../types";
import { clearAuthToken } from "../../lib/api";

type AccountStore = {
  account: Account | null;
  plans: Plan[];
  quests: Quest[];
  setAccount: (account: Account, plans?: Plan[], quests?: Quest[]) => void;
  setPlans: (plans: Plan[]) => void;
  signOut: () => void;
};

export const useAccountStore = create<AccountStore>((set) => ({
  account: null,
  plans: [],
  quests: [],
  setAccount: (account, plans, quests) => {
    // The session token is persisted at login/signup (not here) — setAccount only
    // mirrors server state, and boot re-auths with the already-stored token.
    set((state) => ({ account, plans: plans ?? state.plans, quests: quests ?? state.quests }));
  },
  setPlans: (plans) => set({ plans }),
  signOut: () => {
    clearAuthToken();
    set({ account: null });
  },
}));

/**
 * Apply an API result ({ account, plans, quests }) to the store in one call.
 * Factors out the `setAccount(result.account, result.plans, result.quests)`
 * that every mutation handler was repeating (30+ sites).
 */
export function applyAccountResult(result: { account: Account; plans: Plan[]; quests: Quest[] }): void {
  useAccountStore.getState().setAccount(result.account, result.plans, result.quests);
}

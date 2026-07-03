import { create } from "zustand";
import type { Account, Plan, Quest } from "../../types";
import { clearStoredAccountId, storeAccountId } from "../../lib/api";

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
    storeAccountId(account.id);
    set((state) => ({ account, plans: plans ?? state.plans, quests: quests ?? state.quests }));
  },
  setPlans: (plans) => set({ plans }),
  signOut: () => {
    clearStoredAccountId();
    set({ account: null });
  },
}));

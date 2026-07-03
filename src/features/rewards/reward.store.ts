import { nanoid } from "nanoid";
import { create } from "zustand";

export type Celebration = {
  id: string;
  title: string;
  credits: number;
  icon: "gift" | "trophy" | "cake";
};

type CelebrationInput = Omit<Celebration, "id">;

type RewardStore = {
  celebration: Celebration | null;
  celebrate: (input: CelebrationInput) => void;
  clear: () => void;
};

/**
 * One celebration at a time: claiming a reward stages a full-screen reveal
 * (see RewardReveal). The id re-mounts the scene so back-to-back rewards each
 * get their own staging.
 */
export const useRewardStore = create<RewardStore>((set) => ({
  celebration: null,
  celebrate: (input) => set({ celebration: { ...input, id: nanoid() } }),
  clear: () => set({ celebration: null }),
}));

/** Imperative helper so plain handlers can trigger a celebration. */
export function celebrate(input: CelebrationInput) {
  useRewardStore.getState().celebrate(input);
}

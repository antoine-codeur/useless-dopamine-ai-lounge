import { create } from "zustand";
import { persist } from "zustand/middleware";
import { maybeNotifyQuest } from "./quest.notice";

type QuestProgressStore = {
  /** Raw usage counters — the fuel every quest series measures. */
  counters: Record<string, number>;
  /** Claimed tiers, keyed "seriesId:target". */
  claims: Record<string, true>;
  /** Credits earned from achievements, for the hero header. */
  earned: number;
  /** Day key of the last daily-booster claim (one per day). */
  dailyBoosterDay: string | null;
  bump: (key: string, by?: number) => void;
  claimTier: (seriesId: string, target: number, reward: number) => boolean;
  claimDailyBooster: () => boolean;
};

export const useQuestStore = create<QuestProgressStore>()(
  persist(
    (set, get) => ({
      counters: {},
      claims: {},
      earned: 0,
      dailyBoosterDay: null,
      claimDailyBooster: () => {
        const today = new Date().toISOString().slice(0, 10);

        if (get().dailyBoosterDay === today) {
          return false;
        }

        set({ dailyBoosterDay: today });
        return true;
      },
      bump: (key, by = 1) => {
        const before = get().counters[key] ?? 0;
        set((state) => ({ counters: { ...state.counters, [key]: (state.counters[key] ?? 0) + by } }));
        maybeNotifyQuest(key, before, before + by);
      },
      claimTier: (seriesId, target, reward) => {
        const key = `${seriesId}:${target}`;

        if (get().claims[key]) {
          return false;
        }

        set((state) => ({
          claims: { ...state.claims, [key]: true },
          earned: state.earned + reward,
        }));
        return true;
      },
    }),
    { name: "uda:quest-progress" },
  ),
);

/** Imperative counter bump so any handler can record usage without hooks. */
export function bumpQuest(key: string, by = 1) {
  useQuestStore.getState().bump(key, by);
}

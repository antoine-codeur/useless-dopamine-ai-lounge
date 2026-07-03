import { create } from "zustand";
import { persist } from "zustand/middleware";
import { bumpQuest } from "../quests/quest.store";

export const LEVEL_XP = 100;
export const SEASON_TIERS = 30;
export const PREMIUM_PASS_PRICE = 750;

/** Monthly seasons: "2026-07" → "Season · July 2026". */
export function currentSeasonId(): string {
  return new Date().toISOString().slice(0, 7);
}

export function seasonLabel(seasonId: string): string {
  const [year, month] = seasonId.split("-").map(Number);
  const name = new Date(Date.UTC(year, (month ?? 1) - 1, 1)).toLocaleString("en", { month: "long" });
  return `${name} ${year}`;
}

export function levelFor(xp: number): number {
  return Math.min(SEASON_TIERS, Math.floor(xp / LEVEL_XP) + 1);
}

/** Credits paid by each tier — premium doubles and then some. */
export function freeRewardFor(tier: number): number {
  return 15 + tier * 5;
}

export function premiumRewardFor(tier: number): number {
  return 30 + tier * 10;
}

type SeasonStore = {
  seasonId: string;
  xp: number;
  premium: boolean;
  /** Claimed tiers, keyed "tier:free" / "tier:premium". */
  claims: Record<string, true>;
  lastCheckInDay: string | null;
  streak: number;
  bestStreak: number;
  addXp: (amount: number) => void;
  /** Returns the XP granted (0 = already checked in today). */
  checkIn: () => number;
  claimTier: (tier: number, track: "free" | "premium") => boolean;
  unlockPremium: () => void;
};

function freshSeason(seasonId: string) {
  return { seasonId, xp: 0, premium: false, claims: {} as Record<string, true> };
}

export const useSeasonStore = create<SeasonStore>()(
  persist(
    (set, get) => ({
      ...freshSeason(currentSeasonId()),
      lastCheckInDay: null,
      streak: 0,
      bestStreak: 0,
      addXp: (amount) => {
        const state = get();
        // A new month = a new season: the track resets, streaks survive.
        const base = state.seasonId === currentSeasonId() ? state : { ...state, ...freshSeason(currentSeasonId()) };
        const before = levelFor(base.xp);
        const xp = base.xp + Math.max(0, Math.round(amount));
        const after = levelFor(xp);

        if (after > before) {
          bumpQuest("season-levels", after - before);
        }

        set({ ...base, xp });
      },
      checkIn: () => {
        const state = get();
        const today = new Date().toISOString().slice(0, 10);

        if (state.lastCheckInDay === today) {
          return 0;
        }

        const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
        const streak = state.lastCheckInDay === yesterday ? state.streak + 1 : 1;
        const bestStreak = Math.max(state.bestStreak, streak);
        const gained = 60 + Math.min(streak, 7) * 10;

        bumpQuest("check-ins");

        if (bestStreak > state.bestStreak) {
          bumpQuest("best-streak", bestStreak - state.bestStreak);
        }

        set({ lastCheckInDay: today, streak, bestStreak });
        get().addXp(gained);
        return gained;
      },
      claimTier: (tier, track) => {
        const state = get();
        const key = `${tier}:${track}`;

        if (state.claims[key] || levelFor(state.xp) < tier || (track === "premium" && !state.premium)) {
          return false;
        }

        set({ claims: { ...state.claims, [key]: true } });
        return true;
      },
      unlockPremium: () => set({ premium: true }),
    }),
    { name: "uda:season" },
  ),
);

/** Imperative XP so chat/quests/shop handlers can feed the pass without hooks. */
export function addSeasonXp(amount: number) {
  useSeasonStore.getState().addXp(amount);
}

import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeId, ThemeVariant, User } from "../../types";
import { hoursBetween, isoNow, todayKey } from "../../lib/date";

// Only Default AI (and classic light) ship unlocked; the rest costs credits.
const initialTheme: ThemeVariant = {
  themeId: "default-ai",
  mode: "light",
};

type UserStore = {
  user: User;
  spendCredits: (amount: number) => boolean;
  grantCredits: (amount: number) => void;
  recordActivity: (points: number) => void;
  setTheme: (theme: ThemeVariant) => void;
  unlockTheme: (themeId: ThemeId) => void;
  unlockPolarized: () => void;
  /** Refunds re-lock; if the refunded theme/mode is active, fall back. */
  lockTheme: (themeId: ThemeId) => void;
  lockPolarized: () => void;
  regenerateCredits: () => void;
};

const initialUser: User = {
  id: nanoid(),
  username: "Toine",
  credits: 100,
  weeklyCreditsUsed: 0,
  hourlyCreditsUsed: 0,
  boosters: 1,
  badges: [
    {
      id: "early-simulator",
      label: "Early Simulator",
      kind: "parody",
    },
  ],
  themes: ["default-ai"],
  activeTheme: initialTheme,
  activityByDate: {},
  lastCreditGrantAt: isoNow(),
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: initialUser,
      spendCredits: (amount) => {
        const { user } = get();

        if (user.credits < amount) {
          return false;
        }

        set({
          user: {
            ...user,
            credits: user.credits - amount,
            hourlyCreditsUsed: user.hourlyCreditsUsed + amount,
            weeklyCreditsUsed: user.weeklyCreditsUsed + amount,
          },
        });

        return true;
      },
      grantCredits: (amount) => {
        const { user } = get();
        set({ user: { ...user, credits: user.credits + amount } });
      },
      recordActivity: (points) => {
        const { user } = get();
        const key = todayKey();
        set({
          user: {
            ...user,
            activityByDate: {
              ...user.activityByDate,
              [key]: (user.activityByDate[key] ?? 0) + points,
            },
          },
        });
      },
      setTheme: (theme) => {
        const { user } = get();
        set({ user: { ...user, activeTheme: theme } });
      },
      unlockTheme: (themeId) => {
        const { user } = get();

        if (user.themes.includes(themeId)) {
          return;
        }

        set({ user: { ...user, themes: [...user.themes, themeId] } });
      },
      unlockPolarized: () => {
        const { user } = get();
        set({ user: { ...user, polarizedUnlocked: true } });
      },
      lockTheme: (themeId) => {
        const { user } = get();
        const activeTheme = user.activeTheme.themeId === themeId ? { ...user.activeTheme, themeId: "default-ai" as ThemeId } : user.activeTheme;
        set({ user: { ...user, themes: user.themes.filter((id) => id !== themeId), activeTheme } });
      },
      lockPolarized: () => {
        const { user } = get();
        const mode = user.activeTheme.mode.endsWith("-polarized") ? (user.activeTheme.mode.replace("-polarized", "") as ThemeVariant["mode"]) : user.activeTheme.mode;
        set({ user: { ...user, polarizedUnlocked: false, activeTheme: { ...user.activeTheme, mode } } });
      },
      regenerateCredits: () => {
        const { user } = get();
        const elapsedHours = hoursBetween(user.lastCreditGrantAt);
        const grants = Math.floor(elapsedHours / 5);

        if (grants <= 0) {
          return;
        }

        set({
          user: {
            ...user,
            credits: Math.min(250, user.credits + grants * 20),
            lastCreditGrantAt: isoNow(),
          },
        });
      },
    }),
    {
      name: "uda:user",
      // v3 introduces theme locks: whatever the user already runs stays theirs
      // (grandfathered), everything else needs a credit unlock.
      version: 3,
      migrate: (persisted, fromVersion) => {
        const state = persisted as { user: User } | undefined;

        if (state?.user && fromVersion < 2) {
          state.user.activeTheme = initialTheme;
        }

        if (state?.user && fromVersion < 3) {
          const active = state.user.activeTheme;

          if (active.mode.endsWith("polarized")) {
            state.user.polarizedUnlocked = true;
          }

          if (!state.user.themes.includes(active.themeId)) {
            state.user.themes = [...state.user.themes, active.themeId];
          }
        }

        return state as { user: User };
      },
    },
  ),
);


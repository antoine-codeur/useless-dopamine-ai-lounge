import { create } from "zustand";
import type { ThemeVariant } from "../../types";
import { useUserStore } from "../profile/profile.store";
import { bumpQuest } from "../quests/quest.store";

type ThemeStore = {
  activeTheme: ThemeVariant;
  setActiveTheme: (theme: ThemeVariant) => void;
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
  activeTheme: useUserStore.getState().user.activeTheme,
  setActiveTheme: (theme) => {
    const previous = get().activeTheme;

    if (theme.themeId !== previous.themeId) {
      bumpQuest("theme-switches");
    }

    if (theme.mode !== previous.mode) {
      bumpQuest("mode-switches");
    }

    useUserStore.getState().setTheme(theme);
    set({ activeTheme: theme });
  },
}));

useUserStore.subscribe((state) => {
  useThemeStore.setState({ activeTheme: state.user.activeTheme });
});

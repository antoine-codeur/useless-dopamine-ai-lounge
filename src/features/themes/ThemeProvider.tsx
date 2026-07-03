import { PropsWithChildren, useEffect } from "react";
import { useThemeStore } from "./theme.store";
import { getTheme } from "./themes";

export function ThemeProvider({ children }: PropsWithChildren) {
  const activeTheme = useThemeStore((state) => state.activeTheme);

  useEffect(() => {
    const tokens = getTheme(activeTheme.themeId, activeTheme.mode);
    const root = document.documentElement;

    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    root.dataset.theme = activeTheme.themeId;
    root.dataset.mode = activeTheme.mode;
  }, [activeTheme]);

  return children;
}

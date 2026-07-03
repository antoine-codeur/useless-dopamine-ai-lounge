import type { Theme, ThemeId, ThemeMode, ThemeTokens } from "../../types";

/** Selectable light/dark variants, in display order. */
export const themeModes: ThemeMode[] = ["dark", "dark-polarized", "light", "light-polarized"];

/** Human labels — never leak token ids like "light-polarized" into the UI. */
export const themeModeLabels: Record<ThemeMode, string> = {
  dark: "Dark",
  "dark-polarized": "Dark · high contrast",
  light: "Light",
  "light-polarized": "Light · high contrast",
};

const defaultDark: ThemeTokens = {
  background: "#0e1117",
  surface: "#171c25",
  surfaceAlt: "#212936",
  text: "#f5f8fd",
  mutedText: "#a3adbe",
  primary: "#35d0c0",
  secondary: "#ff9d6c",
  border: "#2b3342",
  success: "#57d98a",
  warning: "#ffce5c",
  danger: "#ff6b7d",
  glow: "rgba(53, 208, 192, 0.42)",
};

/**
 * Each theme defines its identity on a dark base; the light and polarized
 * variants are derived so surfaces stay layered and cards pop above a softly
 * tinted background. Light-polarized is the app default, so it is tuned to feel
 * bright, clean, and appetizing rather than flat.
 */
const variants = (base: ThemeTokens): Theme["variants"] => ({
  dark: base,
  "dark-polarized": {
    ...base,
    background: "#070a0f",
    surface: "#0f141c",
    surfaceAlt: "#18202b",
    text: "#ffffff",
    border: "#232c3a",
    glow: base.glow,
  },
  light: {
    ...base,
    background: "#f6f4ee",
    surface: "#ffffff",
    surfaceAlt: "#efece3",
    text: "#141821",
    mutedText: "#5f6878",
    border: "#e6e1d5",
    glow: base.glow,
  },
  "light-polarized": {
    ...base,
    background: "#f3f5fc",
    surface: "#ffffff",
    surfaceAlt: "#edf0fa",
    text: "#0c0f17",
    mutedText: "#596272",
    border: "#e3e8f4",
    glow: base.glow,
  },
});

export const themes: Theme[] = [
  { id: "default-ai", label: "Default AI", variants: variants(defaultDark) },
  {
    id: "neon-terminal",
    label: "Neon Terminal",
    variants: variants({
      ...defaultDark,
      background: "#08110d",
      surface: "#101a15",
      surfaceAlt: "#16261e",
      primary: "#4dffab",
      secondary: "#eaff6b",
      glow: "rgba(77, 255, 171, 0.4)",
    }),
  },
  {
    id: "cosmic-purple",
    label: "Cosmic Purple",
    variants: variants({
      ...defaultDark,
      background: "#141021",
      surface: "#1e1830",
      surfaceAlt: "#2a2144",
      primary: "#b79bff",
      secondary: "#66e6ff",
      glow: "rgba(183, 155, 255, 0.44)",
    }),
  },
  {
    id: "candy-fake-premium",
    label: "Candy Fake Premium",
    variants: variants({
      ...defaultDark,
      background: "#1a1220",
      surface: "#261a2c",
      surfaceAlt: "#35243d",
      primary: "#ff86c9",
      secondary: "#8be3ff",
      glow: "rgba(255, 134, 201, 0.44)",
    }),
  },
  {
    id: "brawl-pop",
    label: "Brawl-like Pop",
    variants: variants({
      ...defaultDark,
      background: "#0f1520",
      surface: "#182234",
      surfaceAlt: "#243350",
      primary: "#ffc73d",
      secondary: "#4cd2ff",
      glow: "rgba(255, 199, 61, 0.42)",
    }),
  },
  {
    id: "corporate-dystopia",
    label: "Corporate Dystopia",
    variants: variants({
      ...defaultDark,
      background: "#0f1113",
      surface: "#1b1f24",
      surfaceAlt: "#282d34",
      primary: "#9fb2c6",
      secondary: "#ff8f70",
      glow: "rgba(159, 178, 198, 0.34)",
    }),
  },
];

export function getTheme(themeId: ThemeId, mode: ThemeMode): ThemeTokens {
  return themes.find((theme) => theme.id === themeId)?.variants[mode] ?? themes[0].variants["light-polarized"];
}

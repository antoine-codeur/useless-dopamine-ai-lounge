import { useState } from "react";
import { Check, Lock, Moon, MoonStar, Palette, Settings2, Sun, SunMedium, Zap } from "lucide-react";
import { IconButton } from "../../components/Button/Button";
import { useDismiss } from "../../lib/useDismiss";
import { useThemeStore } from "./theme.store";
import { themeModeLabels, themeModes } from "./themes";
import { POLARIZED_UNLOCK_COST, useThemeUnlock } from "./useThemeUnlock";
import { useShellStore } from "../shell/shell.store";
import type { ThemeMode } from "../../types";
import "./ModeMenu.css";

const modeIcons: Record<ThemeMode, typeof Moon> = {
  dark: Moon,
  "dark-polarized": MoonStar,
  light: Sun,
  "light-polarized": SunMedium,
};

/**
 * Palette trigger + anchored popover offering the four appearance variants
 * (classic/high-contrast x light/dark), with a shortcut to full theme settings.
 */
export function ModeMenu() {
  const [open, setOpen] = useState(false);
  const activeTheme = useThemeStore((state) => state.activeTheme);
  const setActiveTheme = useThemeStore((state) => state.setActiveTheme);
  const setView = useShellStore((state) => state.setView);
  const { isModeLocked, unlockPolarizedWithCredits } = useThemeUnlock();
  const menuRef = useDismiss<HTMLDivElement>(open, () => setOpen(false));

  function pickMode(mode: ThemeMode) {
    if (isModeLocked(mode) && !unlockPolarizedWithCredits()) {
      return;
    }

    setActiveTheme({ ...activeTheme, mode });
    setOpen(false);
  }

  return (
    <div className="mode-menu" ref={menuRef}>
      <IconButton aria-expanded={open} className="composer-tool" label="Appearance" onClick={() => setOpen((value) => !value)} type="button">
        <Palette size={18} />
      </IconButton>
      {open ? (
        <div aria-label="Appearance" className="mode-menu__popover" role="menu">
          {themeModes.map((mode) => {
            const Icon = modeIcons[mode];
            const active = activeTheme.mode === mode;
            const locked = isModeLocked(mode);
            return (
              <button aria-checked={active} data-active={active} data-locked={locked || undefined} key={mode} onClick={() => pickMode(mode)} role="menuitemradio" type="button">
                <Icon size={15} />
                {themeModeLabels[mode]}
                {locked ? (
                  <span className="mode-menu__lock">
                    <Lock size={12} /> {POLARIZED_UNLOCK_COST} <Zap size={11} />
                  </span>
                ) : active ? (
                  <Check className="mode-menu__check" size={14} />
                ) : null}
              </button>
            );
          })}
          <hr className="mode-menu__divider" />
          <button
            onClick={() => {
              setView("settings");
              setOpen(false);
            }}
            role="menuitem"
            type="button"
          >
            <Settings2 size={15} />
            More themes…
          </button>
        </div>
      ) : null}
    </div>
  );
}

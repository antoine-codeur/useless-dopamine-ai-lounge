import { CalendarDays, Lock, Sparkles, Zap } from "lucide-react";
import { IconButton } from "../../components/Button/Button";
import { CountUp } from "../../components/CountUp/CountUp";
import { InfoBubble } from "../../components/InfoBubble/InfoBubble";
import { ActivityCalendar } from "../../components/ActivityCalendar/ActivityCalendar";
import { useThemeStore } from "../themes/theme.store";
import { themes } from "../themes/themes";
import { THEME_UNLOCK_COST, useThemeUnlock } from "../themes/useThemeUnlock";
import { useShellStore } from "../shell/shell.store";

type InspectorProps = {
  credits: number;
  promptCost: number;
  creditsUsed: number;
  planLabel: string;
  boosters: number;
  activityByDate: Record<string, number>;
};

/** Right rail: credit hero, usage stats, activity grid, and quick theme switcher. */
export function Inspector({ credits, promptCost, creditsUsed, planLabel, boosters, activityByDate }: InspectorProps) {
  const setView = useShellStore((state) => state.setView);
  const activeTheme = useThemeStore((state) => state.activeTheme);
  const setActiveTheme = useThemeStore((state) => state.setActiveTheme);
  const { isThemeLocked, unlockThemeWithCredits } = useThemeUnlock();

  return (
    <aside className="inspector">
      <section className="inspector-card inspector-card--hero">
        <div>
          <span className="label-with-info">
            Credits
            <InfoBubble label="Credit help">
              <strong>How credits work</strong>
              <p>Prompts spend credits. Earn more through quests, boosters, birthday rewards, or account upgrades.</p>
              <button onClick={() => setView("earn")} type="button">Go to Earn</button>
              <button onClick={() => setView("plans")} type="button">View Plans</button>
            </InfoBubble>
          </span>
          <strong>
            <CountUp value={credits} />
          </strong>
        </div>
        <button aria-label="Open credit rewards" className="credit-ring" data-tooltip="Open credit rewards" onClick={() => setView("earn")} type="button">
          <Sparkles size={18} />
        </button>
      </section>

      <section className="inspector-card">
        <div className="panel__header">
          <h2>Usage</h2>
          <IconButton className="mini-icon-button" label="Open activity & usage" onClick={() => setView("activity")} type="button">
            <Zap size={14} />
          </IconButton>
        </div>
        <div className="stat-row"><span>Prompt cost</span><strong>{promptCost} / step</strong></div>
        <div className="stat-row"><span>Chat usage</span><strong>{creditsUsed}</strong></div>
        <div className="stat-row"><span>Plan</span><strong>{planLabel}</strong></div>
        <div className="stat-row"><span>Boosters</span><strong>{boosters}</strong></div>
      </section>

      <section className="inspector-card">
        <div className="panel__header">
          <h2 className="label-with-info">
            Activity
            <InfoBubble label="Activity details">
              <strong>Activity grid</strong>
              <p>Hover each square to see the date, points, and current plan for that day.</p>
            </InfoBubble>
          </h2>
          <IconButton className="mini-icon-button" label="Open activity page" onClick={() => setView("activity")} type="button">
            <CalendarDays size={14} />
          </IconButton>
        </div>
        <ActivityCalendar activityByDate={activityByDate} planLabel={planLabel} />
      </section>

      <section className="inspector-card">
        <div className="panel__header">
          <h2>Theme</h2>
        </div>
        <div className="theme-list">
          {themes.map((theme) => {
            const locked = isThemeLocked(theme.id);
            return (
              <button
                className="theme-chip"
                data-active={activeTheme.themeId === theme.id}
                data-locked={locked || undefined}
                data-tooltip={locked ? `Unlock for ${THEME_UNLOCK_COST} credits` : undefined}
                key={theme.id}
                onClick={() => {
                  if (locked) {
                    if (!unlockThemeWithCredits(theme.id, theme.label)) {
                      return;
                    }
                  }
                  setActiveTheme({ ...activeTheme, themeId: theme.id });
                }}
                type="button"
              >
                {locked ? <Lock size={13} /> : null}
                {theme.label}
                {locked ? <span className="theme-chip__cost">{THEME_UNLOCK_COST} <Zap size={10} /></span> : null}
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}

import { useEffect, useState } from "react";
import { CalendarCheck, Check, Gift, MessageSquare, Puzzle, Search, Star, Trophy, Zap } from "lucide-react";
import { Button } from "../../components/Button/Button";
import { GuestPanel } from "../account/GuestPanel";
import { applyAccountResult, useAccountStore } from "../profile/account.store";
import { useUserStore } from "../profile/profile.store";
import { useChatStore } from "../chat/chat.store";
import { computeActivityStats } from "../activity/activity.stats";
import { celebrate } from "../rewards/reward.store";
import { creditGain } from "../rewards/creditCombo.store";
import { showToast } from "../../components/Toast/toast.store";
import { claimDailyBooster as claimDailyBoosterApi } from "../../lib/api";
import { boostGain } from "../../lib/planPerks";
import { addSeasonXp } from "../season/season.store";
import { totalAppSeconds, totalClicks, useTelemetryStore } from "../stats/telemetry.store";
import { bumpQuest, useQuestStore } from "./quest.store";
import { useQuestNoticeStore } from "./quest.notice";
import { recordCredit } from "../stats/ledger.store";
import { questCategories, questSeries, rewardForTier, seriesProgress, totalQuestCount } from "./quest.engine";
import type { QuestCategory } from "./quest.engine";
import type { Quest } from "../../types";
import "./QuestsPanel.css";

type QuestsPanelProps = {
  activityByDate: Record<string, number>;
  onClaimQuest: (questId: Quest["id"]) => void;
  onCreateAccount: () => void;
  onLogin: () => void;
};

const dailyMeta: Record<Quest["id"], { icon: typeof Trophy; description: string }> = {
  "daily-check-in": { icon: CalendarCheck, description: "Show up today — presence is the whole quest." },
  "send-three-prompts": { icon: MessageSquare, description: "Send three prompts today." },
  "open-first-booster": { icon: Gift, description: "Open your first booster from the Earn page." },
};

/** LoL-style quest board: daily quests + ~500 tiered achievements. */
export function QuestsPanel({ activityByDate, onClaimQuest, onCreateAccount, onLogin }: QuestsPanelProps) {
  const account = useAccountStore((state) => state.account);
  const plans = useAccountStore((state) => state.plans);
  const backendQuests = useAccountStore((state) => state.quests);
  const setAccount = useAccountStore((state) => state.setAccount);
  const user = useUserStore((state) => state.user);
  useChatStore((state) => state.threads.length); // refresh progress as you chat
  const counters = useQuestStore((state) => state.counters);
  const claims = useQuestStore((state) => state.claims);
  const earned = useQuestStore((state) => state.earned);
  const clicks = useTelemetryStore((state) => state.clicks);
  const pageTime = useTelemetryStore((state) => state.pageTime);
  const planChanges = useTelemetryStore((state) => state.planChanges);
  const dailyBoosterDay = useQuestStore((state) => state.dailyBoosterDay);
  const today = new Date().toISOString().slice(0, 10);
  const boosterClaimedToday = account?.dailyBoosterDay === today || dailyBoosterDay === today;
  const [claimingBooster, setClaimingBooster] = useState(false);
  const [category, setCategory] = useState<QuestCategory | "all">("all");
  const [query, setQuery] = useState("");
  const focusSeriesId = useQuestNoticeStore((state) => state.focusSeriesId);

  // Arriving from a quest toast: reset filters, scroll to the quest, pulse it.
  useEffect(() => {
    if (!focusSeriesId) {
      return;
    }

    setCategory("all");
    setQuery("");
    const frame = requestAnimationFrame(() => {
      const tile = document.getElementById(`quest-series-${focusSeriesId}`);
      tile?.scrollIntoView({ behavior: "smooth", block: "center" });
      tile?.setAttribute("data-focus", "true");
      window.setTimeout(() => tile?.removeAttribute("data-focus"), 1_800);
      useQuestNoticeStore.getState().clearFocus();
    });
    return () => cancelAnimationFrame(frame);
  }, [focusSeriesId]);

  if (!account) {
    return (
      <GuestPanel
        icon={<Trophy size={22} />}
        title="Quests need an account"
        text="Progress, claims, and credit rewards persist on your account. Guests keep the free credit pool."
        onCreate={onCreateAccount}
        onLogin={onLogin}
      />
    );
  }

  const ctx = {
    counters,
    stats: computeActivityStats(activityByDate),
    user,
    telemetry: {
      totalClicks: totalClicks(clicks),
      appMinutes: Math.floor(totalAppSeconds(pageTime) / 60),
      planChanges,
    },
  };
  const rows = questSeries.map((series) => seriesProgress(series, ctx, claims));
  const claimedTotal = rows.reduce((sum, row) => sum + row.claimedCount, 0);
  const claimableCount = rows.filter((row) => row.claimable).length;
  const visible = rows.filter((row) => {
    const matchesCategory = category === "all" || row.series.category === category;
    const text = `${row.series.name} ${row.series.describe(row.nextTarget ?? row.series.tiers[0])}`.toLowerCase();
    return matchesCategory && (!query.trim() || text.includes(query.trim().toLowerCase()));
  });

  function claimAchievement(rowIndex: number) {
    const row = rows[rowIndex];

    if (!row || !row.claimable || row.nextTarget === null || !account) {
      return;
    }

    // Paid plans boost every gain: Pro +5%, Max +10%, Max+ +20%.
    const reward = boostGain(rewardForTier(row.nextTierIndex), account.plan);

    if (!useQuestStore.getState().claimTier(row.series.id, row.nextTarget, reward)) {
      return;
    }

    bumpQuest("quests-claimed");
    bumpQuest("credits-earned", reward);
    setAccount({ ...account, creditsRemaining: account.creditsRemaining + reward }, plans, backendQuests);
    recordCredit(reward, `Quest: ${row.series.describe(row.nextTarget)}`, "quest");
    addSeasonXp(15);
    creditGain(reward);
    celebrate({ title: row.series.describe(row.nextTarget), credits: reward, icon: "trophy" });
  }

  return (
    <section className="content-panel quests-panel">
      <div className="quests-hero">
        <div className="quests-hero__medal">
          <Trophy size={26} />
        </div>
        <div className="quests-hero__meta">
          <h3>Quests</h3>
          <p className="muted">
            {totalQuestCount.toLocaleString()} achievements across every feature — {claimableCount > 0 ? `${claimableCount} ready to claim!` : "keep playing to unlock the next tier."}
          </p>
          <div aria-label={`${claimedTotal} of ${totalQuestCount} quests complete`} className="quests-hero__track">
            <span style={{ width: `${Math.min(100, Math.round((claimedTotal / totalQuestCount) * 100))}%` }} />
            <strong>
              {claimedTotal.toLocaleString()} / {totalQuestCount.toLocaleString()}
            </strong>
          </div>
        </div>
        <div className="quests-hero__pool">
          <Zap size={15} />
          {earned.toLocaleString()} credits earned
        </div>
      </div>

      <section className="quest-section">
        <h4 className="quest-section__title">Daily quests</h4>
        <div className="quest-board quest-board--dailies">
          <article className="quest-tile" data-complete={boosterClaimedToday || undefined}>
            <span className="quest-tile__medal">
              <Puzzle size={20} />
            </span>
            <div className="quest-tile__body">
              <header>
                <strong>Daily booster</strong>
                <span className="quest-tile__reward">+1 booster / day</span>
              </header>
              <p>One free booster every day — open it as a puzzle from the Earn page.</p>
            </div>
            <Button
              className="quest-tile__claim"
              disabled={boosterClaimedToday || claimingBooster}
              loading={claimingBooster}
              onClick={() => {
                void (async () => {
                  setClaimingBooster(true);
                  const result = await claimDailyBoosterApi().catch(() => null);
                  setClaimingBooster(false);

                  if (!result?.ok) {
                    if (result?.account) {
                      applyAccountResult(result);
                    }

                    showToast({ variant: "info", title: "Already claimed today", description: "Your next booster unlocks tomorrow." });
                    return;
                  }

                  applyAccountResult(result);
                  useQuestStore.getState().claimDailyBooster();
                  bumpQuest("daily-booster");
                  showToast({ variant: "success", title: "Booster added", description: "Open it from the Earn page — tap fast for a higher rarity." });
                })();
              }}
              size="sm"
              type="button"
              variant={boosterClaimedToday ? "secondary" : "primary"}
            >
              {boosterClaimedToday ? (
                <>
                  <Check size={14} /> Claimed
                </>
              ) : (
                "Claim"
              )}
            </Button>
          </article>
          {backendQuests.map((quest) => {
            const meta = dailyMeta[quest.id];
            const Icon = meta?.icon ?? Trophy;
            const claimed = account.questClaims?.[quest.id];
            const exhausted = !!claimed && quest.repeat !== "daily";

            return (
              <article className="quest-tile" data-complete={exhausted || undefined} key={quest.id}>
                <span className="quest-tile__medal">
                  <Icon size={20} />
                </span>
                <div className="quest-tile__body">
                  <header>
                    <strong>{quest.label}</strong>
                    <span className="quest-tile__reward">
                      +{quest.rewardCredits} <Zap size={11} />
                      {quest.repeat === "daily" ? " / day" : ""}
                    </span>
                  </header>
                  <p>{meta?.description}</p>
                </div>
                <Button className="quest-tile__claim" disabled={exhausted} onClick={() => onClaimQuest(quest.id)} size="sm" type="button" variant="secondary">
                  {exhausted ? (
                    <>
                      <Check size={14} /> Claimed
                    </>
                  ) : (
                    "Claim"
                  )}
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="quest-section">
        <div className="quest-filters">
          <h4 className="quest-section__title">Achievements</h4>
          <label className="quest-search">
            <Search size={14} />
            <input aria-label="Search quests" onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search" type="search" value={query} />
          </label>
          <div aria-label="Quest categories" className="quest-categories" role="tablist">
            {questCategories.map((entry) => (
              <button aria-selected={category === entry.id} data-active={category === entry.id} key={entry.id} onClick={() => setCategory(entry.id)} role="tab" type="button">
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="quest-board">
          {visible.map((row) => {
            const Icon = row.series.icon;
            const target = row.nextTarget ?? row.series.tiers[row.series.tiers.length - 1];
            const percent = row.mastered ? 100 : Math.min(100, Math.round((row.value / target) * 100));
            const rowIndex = rows.indexOf(row);

            return (
              <article className="quest-tile" data-complete={row.mastered || undefined} data-ready={row.claimable || undefined} id={`quest-series-${row.series.id}`} key={row.series.id}>
                <span className="quest-tile__medal">
                  <Icon size={20} />
                </span>
                <div className="quest-tile__body">
                  <header>
                    <strong>{row.mastered ? `${row.series.name} — mastered` : row.series.describe(target)}</strong>
                    <span className="quest-tile__reward">
                      {row.mastered ? <Star size={12} /> : (
                        <>
                          +{rewardForTier(row.nextTierIndex)} <Zap size={11} />
                        </>
                      )}
                    </span>
                  </header>
                  <p>
                    {row.series.lesson}
                    <span className="quest-tile__tier">
                      {" "}
                      · {row.series.name} · tier {Math.min(row.claimedCount + 1, row.series.tiers.length)}/{row.series.tiers.length}
                    </span>
                  </p>
                  <div aria-label={`${row.value} of ${target}`} className="quest-tile__track">
                    <span style={{ width: `${percent}%` }} />
                    <small>
                      {Math.min(row.value, target).toLocaleString()} / {target.toLocaleString()}
                    </small>
                  </div>
                </div>
                <Button
                  className="quest-tile__claim"
                  disabled={!row.claimable}
                  onClick={() => claimAchievement(rowIndex)}
                  size="sm"
                  type="button"
                  variant={row.claimable ? "primary" : "secondary"}
                >
                  {row.mastered ? (
                    <>
                      <Check size={14} /> Done
                    </>
                  ) : (
                    "Claim"
                  )}
                </Button>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

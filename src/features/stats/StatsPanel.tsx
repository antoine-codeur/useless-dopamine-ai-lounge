import { BarChart3, Clock, CreditCard, MousePointerClick, Rocket } from "lucide-react";
import { useQuestStore } from "../quests/quest.store";
import { formatDuration as formatMs } from "../../lib/duration";
import { currentPlanSeconds, totalAppSeconds, totalClicks, useTelemetryStore } from "./telemetry.store";
import { CreditLedgerCard, PurchasesCard, ShopStatsCard } from "./CreditsHistory";
import "./StatsPanel.css";

const formatDuration = (seconds: number) => formatMs(seconds * 1000);

const counterLabels: Record<string, string> = {
  messages: "Messages sent",
  ink: "Characters written",
  sessions: "Conversations started",
  wikis: "Wiki articles received",
  pokemon: "Pokémon cards drawn",
  yugioh: "Yu-Gi-Oh! cards drawn",
  attachments: "Files attached",
  "temp-chats": "Temporary chats",
  buds: "Buds grown",
  versions: "Prompt versions",
  branches: "Branches in new chats",
  likes: "Likes given",
  dislikes: "Dislikes given",
  bookmarks: "Results saved",
  "library-opens": "Library reopenings",
  copies: "Markdown copies",
  expands: "Long messages expanded",
  sources: "Source links verified",
  "theme-switches": "Theme switches",
  "mode-switches": "Appearance switches",
  boosters: "Boosters opened",
  "booster-buys": "Boosters bought",
  "daily-booster": "Daily boosters claimed",
  "puzzle-taps": "Puzzle taps",
  dailies: "Daily quests claimed",
  "quests-claimed": "Achievements claimed",
  "credits-spent": "Credits spent",
  "credits-earned": "Credits earned back",
  exports: "Tables copied / exported",
  queued: "Prompts queued",
  onepiece: "One Piece characters met",
  beer: "Beers discovered",
  starwars: "Star Wars lore entries",
  minecraft: "Minecraft articles",
  "page-visits": "Nav clicks",
  "profile-saves": "Profile saves",
  "password-changed": "Password changes",
  "theme-purchases": "Themes bought",
};

/** Everything the app knows about your interactions — nothing hidden. */
export function StatsPanel() {
  const clicks = useTelemetryStore((state) => state.clicks);
  const pageTime = useTelemetryStore((state) => state.pageTime);
  const boots = useTelemetryStore((state) => state.boots);
  const firstSeenAt = useTelemetryStore((state) => state.firstSeenAt);
  const planChanges = useTelemetryStore((state) => state.planChanges);
  const planTime = useTelemetryStore((state) => state.planTime);
  const currentPlan = useTelemetryStore((state) => state.currentPlan);
  const currentPlanSince = useTelemetryStore((state) => state.currentPlanSince);
  const counters = useQuestStore((state) => state.counters);

  const clicksTotal = totalClicks(clicks);
  const appSeconds = totalAppSeconds(pageTime);
  const pageEntries = Object.entries(pageTime).sort(([, a], [, b]) => b - a);
  const maxPage = Math.max(1, ...pageEntries.map(([, seconds]) => seconds));

  // Clicks grouped by region ("sidebar/Chat" -> region "sidebar").
  const regions = new Map<string, { total: number; buttons: [string, number][] }>();
  Object.entries(clicks).forEach(([key, count]) => {
    const [region, ...rest] = key.split("/");
    const label = rest.join("/") || "button";
    const entry = regions.get(region) ?? { total: 0, buttons: [] };
    entry.total += count;
    entry.buttons.push([label, count]);
    regions.set(region, entry);
  });
  const regionEntries = [...regions.entries()].sort(([, a], [, b]) => b.total - a.total);

  const livePlanTime: Record<string, number> = { ...planTime };

  if (currentPlan) {
    livePlanTime[currentPlan] = (livePlanTime[currentPlan] ?? 0) + currentPlanSeconds({ currentPlanSince });
  }

  const planEntries = Object.entries(livePlanTime).sort(([, a], [, b]) => b - a);
  const counterEntries = Object.entries(counters)
    .filter(([key]) => counterLabels[key])
    .sort(([, a], [, b]) => b - a);

  return (
    <section className="content-panel stats-panel">
      <div className="page-heading">
        <div>
          <h3>Statistics</h3>
          <p className="muted">Every trace of your interactions — clicks by domain, time per page, plan journey, raw counters.</p>
        </div>
      </div>

      <div className="profile-metrics dashboard-metrics activity-insights">
        <div><strong>{formatDuration(appSeconds)}</strong><span>Time in the lounge</span></div>
        <div><strong>{clicksTotal.toLocaleString()}</strong><span>Buttons clicked</span></div>
        <div><strong>{boots}</strong><span>App launches</span></div>
        <div><strong>{planChanges}</strong><span>Plan changes</span></div>
        <div><strong>{firstSeenAt.slice(0, 10)}</strong><span>First seen</span></div>
      </div>

      <section className="detail-card stats-card">
        <h4><Clock size={15} /> Time per page</h4>
        {pageEntries.length === 0 ? <p className="muted">Navigate around — time starts counting now.</p> : null}
        {pageEntries.map(([view, seconds]) => (
          <div className="stats-bar" key={view}>
            <span className="stats-bar__label">{view}</span>
            <span className="stats-bar__track">
              <span style={{ width: `${Math.round((seconds / maxPage) * 100)}%` }} />
            </span>
            <strong>{formatDuration(seconds)}</strong>
          </div>
        ))}
      </section>

      <section className="detail-card stats-card">
        <h4><CreditCard size={15} /> Plan journey</h4>
        <div className="stat-row"><span>Plan changes</span><strong>{planChanges}</strong></div>
        {planEntries.map(([plan, seconds]) => (
          <div className="stat-row" key={plan}>
            <span>
              Time on {plan}
              {plan === currentPlan ? " (current)" : ""}
            </span>
            <strong>{formatDuration(seconds)}</strong>
          </div>
        ))}
      </section>

      <CreditLedgerCard />
      <PurchasesCard />
      <ShopStatsCard />

      <section className="detail-card stats-card">
        <h4><MousePointerClick size={15} /> Clicks by domain</h4>
        {regionEntries.length === 0 ? <p className="muted">Every button click lands here, classified by app region.</p> : null}
        {regionEntries.map(([region, entry]) => (
          <details className="stats-region" key={region}>
            <summary>
              <strong>{region}</strong>
              <span>{entry.total.toLocaleString()} clicks</span>
            </summary>
            <div className="stats-region__list">
              {entry.buttons
                .sort(([, a], [, b]) => b - a)
                .slice(0, 20)
                .map(([label, count]) => (
                  <div className="stat-row" key={label}>
                    <span>{label}</span>
                    <strong>{count.toLocaleString()}</strong>
                  </div>
                ))}
            </div>
          </details>
        ))}
      </section>

      <section className="detail-card stats-card">
        <h4><Rocket size={15} /> Usage counters</h4>
        <div className="stats-counter-grid">
          {counterEntries.map(([key, value]) => (
            <div className="stats-counter" key={key}>
              <strong>{value.toLocaleString()}</strong>
              <span>{counterLabels[key]}</span>
            </div>
          ))}
        </div>
        {counterEntries.length === 0 ? <p className="muted">Use the app — every action leaves a number.</p> : null}
      </section>

      <p className="muted stats-footnote">
        <BarChart3 size={13} /> All of it feeds the quest engine — new achievements unlock from these very numbers.
      </p>
    </section>
  );
}

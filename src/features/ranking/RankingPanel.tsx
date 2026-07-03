import { useEffect, useState } from "react";
import { Medal, RefreshCw, TrendingUp, Zap } from "lucide-react";
import { Button } from "../../components/Button/Button";
import { fetchLeaderboard } from "../../lib/api";
import { bumpQuest } from "../quests/quest.store";
import type { LeaderboardRow, PeriodSums } from "../../lib/api";
import "./RankingPanel.css";

type Period = keyof PeriodSums;

const periods: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "total", label: "All time" },
];

const planLabels: Record<string, string> = { free: "Free", pro: "Pro", max: "Max", "max-plus": "Max+" };
const medalColors = ["#ffc73d", "#c8d2de", "#e08d5a"];

/** Server-ranked lounge: credits GAINED per period, usage alongside. */
export function RankingPanel() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [period, setPeriod] = useState<Period>("week");
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    const result = await fetchLeaderboard().catch(() => null);
    setRefreshing(false);

    if (result?.ok) {
      setRows(result.leaderboard);
    }
  }

  useEffect(() => {
    bumpQuest("ranking-visits");
    void load();
  }, []);

  const ranked = [...(rows ?? [])].sort((a, b) => b.gains[period] - a.gains[period] || b.usage[period] - a.usage[period]);
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <section className="content-panel ranking-panel">
      <div className="page-heading">
        <div>
          <h3>Ranking</h3>
          <p className="muted">Who earns the most credits — daily, weekly, monthly, yearly.</p>
        </div>
        <Button disabled={refreshing} loading={refreshing} onClick={() => void load()} size="sm" type="button" variant="secondary">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      <div aria-label="Ranking period" className="ranking-periods" role="tablist">
        {periods.map((entry) => (
          <button aria-selected={period === entry.id} data-active={period === entry.id} key={entry.id} onClick={() => setPeriod(entry.id)} role="tab" type="button">
            {entry.label}
          </button>
        ))}
      </div>

      {rows === null ? <p className="muted">Loading the lounge…</p> : null}
      {rows !== null && ranked.length === 0 ? <p className="muted">No accounts yet — be the first on the board.</p> : null}

      {podium.length > 0 ? (
        <div className="ranking-podium">
          {podium.map((row, index) => (
            <article className="ranking-podium__spot" data-rank={index + 1} data-you={row.you || undefined} key={row.id}>
              <Medal size={20} style={{ color: medalColors[index] }} />
              <strong>{row.username}</strong>
              <span className="ranking-handle">@{row.handle} · {planLabels[row.plan] ?? row.plan}</span>
              <span className="ranking-gains">
                +{row.gains[period].toLocaleString()} <Zap size={12} />
              </span>
              <small>
                <TrendingUp size={11} /> {row.usage[period].toLocaleString()} used
              </small>
            </article>
          ))}
        </div>
      ) : null}

      {rest.length > 0 ? (
        <div className="ranking-list">
          {rest.map((row, index) => (
            <div className="ranking-row" data-you={row.you || undefined} key={row.id}>
              <span className="ranking-row__rank">#{index + 4}</span>
              <span className="ranking-row__name">
                <strong>{row.username}</strong>
                <small>@{row.handle} · {planLabels[row.plan] ?? row.plan}</small>
              </span>
              <span className="ranking-row__usage">{row.usage[period].toLocaleString()} used</span>
              <strong className="ranking-row__gains">
                +{row.gains[period].toLocaleString()} <Zap size={11} />
              </strong>
            </div>
          ))}
        </div>
      ) : null}

      <p className="muted ranking-footnote">Gains = quests, boosters and gifts credited server-side. Chat usage runs alongside.</p>
    </section>
  );
}

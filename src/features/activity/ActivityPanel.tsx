import { useState } from "react";
import { Trophy, Zap } from "lucide-react";
import { Button } from "../../components/Button/Button";
import { ActivityHeatmap, HeatmapMode } from "../../components/ActivityHeatmap/ActivityHeatmap";
import { computeActivityStats } from "./activity.stats";
import { useShellStore } from "../shell/shell.store";

const heatmapModes: { id: HeatmapMode; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "cumulative", label: "Cumulative" },
];

type ActivityPanelProps = {
  activityByDate: Record<string, number>;
  planLabel: string;
  promptCost: number;
  credits: number;
  boosters: number;
  planBillingCycle: string;
  planRenewsAt: string;
};

/** One harmonized page: 12-month heatmap, streak insights, plan & usage facts. */
export function ActivityPanel({ activityByDate, planLabel, promptCost, credits, boosters, planBillingCycle, planRenewsAt }: ActivityPanelProps) {
  const setView = useShellStore((state) => state.setView);
  const [mode, setMode] = useState<HeatmapMode>("daily");
  const stats = computeActivityStats(activityByDate);

  return (
    <section className="content-panel dashboard-page">
      <div className="page-heading">
        <div>
          <h3>Activity & usage</h3>
          <p className="muted">Twelve months of points on the {planLabel} plan — hover any square for details.</p>
        </div>
        <div className="page-heading__actions">
          <Button onClick={() => setView("earn")} type="button" variant="secondary">
            <Trophy size={16} />
            Earn more
          </Button>
          <Button onClick={() => setView("plans")} type="button" variant="secondary">
            <Zap size={16} />
            Upgrade
          </Button>
        </div>
      </div>

      <section className="detail-card heatmap-card">
        <div className="heatmap-card__header">
          <h4>Point activity</h4>
          <div aria-label="Heatmap scale" className="billing-toggle heatmap-modes" role="tablist">
            {heatmapModes.map((entry) => (
              <button aria-selected={mode === entry.id} data-active={mode === entry.id} key={entry.id} onClick={() => setMode(entry.id)} role="tab" type="button">
                {entry.label}
              </button>
            ))}
          </div>
        </div>
        <ActivityHeatmap activityByDate={activityByDate} mode={mode} />
      </section>

      <div className="profile-metrics dashboard-metrics activity-insights">
        <div><strong>{stats.total.toLocaleString()}</strong><span>Total points</span></div>
        <div><strong>{stats.activeDays}</strong><span>Active days</span></div>
        <div><strong>{stats.currentStreak}d</strong><span>Current streak</span></div>
        <div><strong>{stats.longestStreak}d</strong><span>Longest streak</span></div>
        <div><strong>{stats.bestDay?.points ?? 0}</strong><span>Best day</span></div>
      </div>

      <section className="detail-card">
        <div className="stat-row"><span>Plan</span><strong>{planLabel}</strong></div>
        <div className="stat-row"><span>Billing cycle</span><strong>{planBillingCycle}</strong></div>
        <div className="stat-row"><span>Renews</span><strong>{planRenewsAt}</strong></div>
        <div className="stat-row"><span>Prompt cost</span><strong>{promptCost}</strong></div>
        <div className="stat-row"><span>Credits left</span><strong>{credits.toLocaleString()}</strong></div>
        <div className="stat-row"><span>Boosters</span><strong>{boosters}</strong></div>
      </section>
    </section>
  );
}

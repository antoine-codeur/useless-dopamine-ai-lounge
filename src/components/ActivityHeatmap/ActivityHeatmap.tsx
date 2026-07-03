import { useMemo } from "react";
import { addDays, format, startOfWeek, subDays } from "date-fns";
import "./ActivityHeatmap.css";

export type HeatmapMode = "daily" | "weekly" | "cumulative";

type DayCell = { key: string; date: Date; value: number; future: boolean };

type ActivityHeatmapProps = {
  activityByDate: Record<string, number>;
  mode: HeatmapMode;
};

/**
 * Twelve-month, GitHub-style heatmap. Daily colors each day by intensity;
 * weekly/cumulative turn each week column into a cell bar chart. Every past
 * cell carries a floating tooltip via data-tooltip.
 */
export function ActivityHeatmap({ activityByDate, mode }: ActivityHeatmapProps) {
  const { weeks, months } = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(subDays(today, 364), { weekStartsOn: 1 });
    const builtWeeks: DayCell[][] = [];

    for (let weekStart = start; weekStart <= today; weekStart = addDays(weekStart, 7)) {
      const days: DayCell[] = [];

      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const date = addDays(weekStart, dayIndex);
        const key = format(date, "yyyy-MM-dd");
        days.push({ key, date, value: activityByDate[key] ?? 0, future: date > today });
      }

      builtWeeks.push(days);
    }

    const builtMonths: { index: number; label: string }[] = [];
    let previousLabel = "";
    builtWeeks.forEach((week, index) => {
      const label = format(week[0].date, "MMM");

      if (label !== previousLabel) {
        const last = builtMonths[builtMonths.length - 1];

        // A partial month at the very edge would glue into the next label
        // ("JunJul"): too-close marks get replaced instead of stacked.
        if (last && index - last.index < 3) {
          last.index = index;
          last.label = label;
        } else {
          builtMonths.push({ index, label });
        }

        previousLabel = label;
      }
    });

    return { weeks: builtWeeks, months: builtMonths };
  }, [activityByDate]);

  const dailyMax = Math.max(0, ...weeks.flat().map((day) => day.value));
  const weekSums = weeks.map((week) => week.reduce((sum, day) => sum + day.value, 0));
  const maxWeek = Math.max(0, ...weekSums);
  const total = weekSums.reduce((sum, value) => sum + value, 0);
  const runningTotals: number[] = [];
  weekSums.reduce((run, value) => {
    const next = run + value;
    runningTotals.push(next);
    return next;
  }, 0);

  const singleRow = mode !== "daily";

  return (
    <div className="activity-heatmap">
      {/* Keyed by mode so switching Daily/Weekly/Cumulative visibly re-renders.
          Weekly/cumulative collapse to ONE square per week — a week is one unit. */}
      <div
        aria-label="Activity over the last twelve months"
        className="activity-heatmap__grid"
        data-single={singleRow || undefined}
        key={mode}
        role="img"
      >
        {singleRow
          ? weeks.map((week, weekIndex) => {
              const lastPastDay = [...week].reverse().find((day) => !day.future)?.date ?? week[0].date;
              const rangeLabel = `${format(week[0].date, "MMM d")} – ${format(lastPastDay, "MMM d")}`;
              const elapsedDays = week.filter((day) => !day.future).length;
              const perDay = elapsedDays > 0 ? Math.round((weekSums[weekIndex] / elapsedDays) * 10) / 10 : 0;
              const sum = mode === "weekly" ? weekSums[weekIndex] : runningTotals[weekIndex];
              const reference = mode === "weekly" ? maxWeek : total;
              const level = sum === 0 || reference === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((4 * sum) / reference)));
              const tooltip =
                mode === "weekly"
                  ? `${perDay} pts/day · ${rangeLabel}`
                  : `${runningTotals[weekIndex]} pts total · by ${format(lastPastDay, "MMM d")}`;

              return <span data-level={level} data-tooltip={tooltip} key={week[0].key} />;
            })
          : weeks.map((week) =>
              week.map((day) => {
                const level = day.value === 0 || dailyMax === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((4 * day.value) / dailyMax)));
                return (
                  <span
                    data-future={day.future || undefined}
                    data-level={level}
                    data-tooltip={day.future ? undefined : `${day.value} pts · ${format(day.date, "MMM d")}`}
                    key={day.key}
                  />
                );
              }),
            )}
      </div>
      <div aria-hidden="true" className="activity-heatmap__months">
        {months.map((month) => (
          <span key={`${month.label}-${month.index}`} style={{ gridColumnStart: month.index + 1 }}>
            {month.label}
          </span>
        ))}
      </div>
    </div>
  );
}

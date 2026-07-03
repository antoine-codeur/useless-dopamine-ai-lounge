import { addDays, format, subDays } from "date-fns";

export type ActivityStats = {
  total: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  bestDay: { date: string; points: number } | null;
};

/** Aggregates the activity map into totals and GitHub-style streaks. */
export function computeActivityStats(activityByDate: Record<string, number>): ActivityStats {
  const active = Object.entries(activityByDate).filter(([, points]) => points > 0);
  const total = active.reduce((sum, [, points]) => sum + points, 0);
  const bestDay = active.reduce<ActivityStats["bestDay"]>(
    (best, [date, points]) => (best && best.points >= points ? best : { date, points }),
    null,
  );

  const activeKeys = new Set(active.map(([date]) => date));
  const dayKey = (offset: number) => format(subDays(new Date(), offset), "yyyy-MM-dd");

  // Current streak: consecutive active days ending today — or yesterday, so a
  // day that has not been played yet does not break the chain.
  let currentStreak = 0;
  let offset = activeKeys.has(dayKey(0)) ? 0 : 1;
  while (activeKeys.has(dayKey(offset))) {
    currentStreak += 1;
    offset += 1;
  }

  // Longest streak: walk forward from each run start.
  let longestStreak = 0;
  for (const [date] of active) {
    const start = new Date(`${date}T00:00:00`);

    if (activeKeys.has(format(subDays(start, 1), "yyyy-MM-dd"))) {
      continue;
    }

    let length = 0;
    let cursor = start;
    while (activeKeys.has(format(cursor, "yyyy-MM-dd"))) {
      length += 1;
      cursor = addDays(cursor, 1);
    }
    longestStreak = Math.max(longestStreak, length);
  }

  return { total, activeDays: active.length, currentStreak, longestStreak, bestDay };
}

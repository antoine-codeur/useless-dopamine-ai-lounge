/**
 * Paid plans boost every credit GAIN (boosters, quests, combos):
 * Pro +5%, Max +10%, Max+ +20%. Mirrored in backend/server.mjs — keep in sync.
 */
export const PLAN_GAIN_MULTIPLIER: Record<string, number> = {
  free: 1,
  pro: 1.05,
  max: 1.1,
  "max-plus": 1.2,
};

export function planGainMultiplier(plan?: string | null): number {
  return PLAN_GAIN_MULTIPLIER[plan ?? "free"] ?? 1;
}

/** Apply the plan bonus to a gain, rounded to whole credits. */
export function boostGain(amount: number, plan?: string | null): number {
  return Math.round(amount * planGainMultiplier(plan));
}

/** "+20%" — for badges and plan pages. */
export function planGainBonusLabel(plan?: string | null): string | null {
  const multiplier = planGainMultiplier(plan);
  return multiplier > 1 ? `+${Math.round((multiplier - 1) * 100)}%` : null;
}

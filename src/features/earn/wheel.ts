/**
 * Fortune-wheel layout. The order and ids MUST match the server's authoritative
 * WHEEL_SEGMENTS in backend/server.mjs — the server returns the winning id and
 * the client animates the pointer to that segment's index.
 */
export type WheelSegmentKind = "credits" | "booster" | "xp" | "none";

export type WheelSegment = {
  id: string;
  kind: WheelSegmentKind;
  amount: number;
  label: string;
};

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: "credits-10", kind: "credits", amount: 10, label: "+10" },
  { id: "booster-1", kind: "booster", amount: 1, label: "Booster" },
  { id: "credits-25", kind: "credits", amount: 25, label: "+25" },
  { id: "none", kind: "none", amount: 0, label: "Oups" },
  { id: "credits-50", kind: "credits", amount: 50, label: "+50" },
  { id: "xp-100", kind: "xp", amount: 100, label: "+100 XP" },
  { id: "booster-2", kind: "booster", amount: 2, label: "Booster ×2" },
  { id: "jackpot-200", kind: "credits", amount: 200, label: "JACKPOT" },
];

export const WHEEL_INDEX_BY_ID: Record<string, number> = Object.fromEntries(
  WHEEL_SEGMENTS.map((segment, index) => [segment.id, index]),
);

/** The guaranteed first-spin reward — mirrors WHEEL_FIRST_SPIN_ID on the server.
 *  Guests' teaser lands here too, so the signup nudge shows the real reward. */
export const FIRST_SPIN_SEGMENT_ID = "credits-50";

export const WHEEL_SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length;

/** Local date key (YYYY-MM-DD) — matches the server's todayKey() semantics. */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

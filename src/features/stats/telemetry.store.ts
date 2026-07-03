import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isoNow } from "../../lib/date";

type TelemetryStore = {
  /** Button clicks keyed by "region/label" (e.g. "sidebar/Chat"). */
  clicks: Record<string, number>;
  /** Seconds spent per page/view. */
  pageTime: Record<string, number>;
  /** App boots and first-ever visit. */
  boots: number;
  firstSeenAt: string;
  /** Plan journey: switch count, seconds per plan, current stay. */
  planChanges: number;
  planTime: Record<string, number>;
  currentPlan: string;
  currentPlanSince: string;
  recordClick: (key: string) => void;
  addPageTime: (view: string, seconds: number) => void;
  recordBoot: () => void;
  trackPlan: (plan: string) => void;
};

export const useTelemetryStore = create<TelemetryStore>()(
  persist(
    (set, get) => ({
      clicks: {},
      pageTime: {},
      boots: 0,
      firstSeenAt: isoNow(),
      planChanges: 0,
      planTime: {},
      currentPlan: "",
      currentPlanSince: isoNow(),
      recordClick: (key) => {
        set((state) => ({ clicks: { ...state.clicks, [key]: (state.clicks[key] ?? 0) + 1 } }));
      },
      addPageTime: (view, seconds) => {
        if (seconds <= 0) {
          return;
        }

        set((state) => ({ pageTime: { ...state.pageTime, [view]: (state.pageTime[view] ?? 0) + seconds } }));
      },
      recordBoot: () => {
        set((state) => ({ boots: state.boots + 1 }));
      },
      trackPlan: (plan) => {
        const state = get();

        if (state.currentPlan === plan) {
          return;
        }

        const elapsed = state.currentPlan ? (Date.now() - new Date(state.currentPlanSince).getTime()) / 1000 : 0;
        set({
          planChanges: state.currentPlan ? state.planChanges + 1 : state.planChanges,
          planTime: state.currentPlan
            ? { ...state.planTime, [state.currentPlan]: (state.planTime[state.currentPlan] ?? 0) + elapsed }
            : state.planTime,
          currentPlan: plan,
          currentPlanSince: isoNow(),
        });
      },
    }),
    { name: "uda:telemetry" },
  ),
);

/** Live seconds in the current plan (accrues between switches). */
export function currentPlanSeconds(state: Pick<TelemetryStore, "currentPlanSince">) {
  return Math.max(0, (Date.now() - new Date(state.currentPlanSince).getTime()) / 1000);
}

export function totalClicks(clicks: Record<string, number>) {
  return Object.values(clicks).reduce((sum, count) => sum + count, 0);
}

export function totalAppSeconds(pageTime: Record<string, number>) {
  return Object.values(pageTime).reduce((sum, seconds) => sum + seconds, 0);
}

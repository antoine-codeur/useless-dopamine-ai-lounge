import { create } from "zustand";
import { questSeries } from "./quest.engine";
import type { QuestCtx, QuestSeries } from "./quest.engine";

export type QuestNotice = {
  /** Changes on every update so the toast can restart its timer/animation. */
  id: number;
  seriesId: string;
  icon: QuestSeries["icon"];
  title: string;
  value: number;
  target: number;
  /** Ring fill before/after this bump, 0..1. */
  from: number;
  to: number;
  done: boolean;
};

type QuestNoticeStore = {
  notice: QuestNotice | null;
  /** Series to scroll to when the Quests page opens from a toast click. */
  focusSeriesId: string | null;
  clear: () => void;
  focus: (seriesId: string) => void;
  clearFocus: () => void;
};

export const useQuestNoticeStore = create<QuestNoticeStore>((set) => ({
  notice: null,
  focusSeriesId: null,
  clear: () => set({ notice: null }),
  focus: (focusSeriesId) => set({ focusSeriesId }),
  clearFocus: () => set({ focusSeriesId: null }),
}));

let noticeSeq = 0;

/** Measures tagged with a counterKey only read that counter — a stub is enough. */
function measuredValue(series: QuestSeries, key: string, counterValue: number): number {
  return series.measure({ counters: { [key]: counterValue } } as unknown as QuestCtx);
}

/**
 * Called on every counter bump: notify when a quest tier completes, or when its
 * progress ring crosses a quarter (25/50/75%). Completions win over progress.
 */
export function maybeNotifyQuest(key: string, beforeCounter: number, afterCounter: number) {
  let best: QuestNotice | null = null;

  for (const series of questSeries) {
    if (series.measure.counterKey !== key) {
      continue;
    }

    const before = measuredValue(series, key, beforeCounter);
    const after = measuredValue(series, key, afterCounter);
    const target = series.tiers.find((tier) => tier > before);

    if (target === undefined || after === before) {
      continue;
    }

    const from = Math.min(1, before / target);
    const to = Math.min(1, after / target);
    const done = after >= target;
    const crossedQuarter = Math.floor(from * 4) !== Math.floor(to * 4) && to >= 0.25;

    if (!done && !crossedQuarter) {
      continue;
    }

    const candidate: QuestNotice = {
      id: ++noticeSeq,
      seriesId: series.id,
      icon: series.icon,
      title: series.describe(target),
      value: Math.min(after, target),
      target,
      from,
      to,
      done,
    };

    if (!best || (candidate.done && !best.done) || (candidate.done === best.done && candidate.to > best.to)) {
      best = candidate;
    }
  }

  if (best) {
    useQuestNoticeStore.setState({ notice: best });
  }
}

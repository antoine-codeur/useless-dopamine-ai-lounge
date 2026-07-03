import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useQuestNoticeStore } from "./quest.notice";
import { useShellStore } from "../shell/shell.store";
import "./QuestToast.css";

/**
 * Quest progress toast: the combo ring, repurposed — it fills with progress
 * (gray → valid) instead of draining with time, and pops a check at 100%.
 * Clicking it opens the Quests page focused on that very quest.
 */
export function QuestToast() {
  const notice = useQuestNoticeStore((state) => state.notice);
  const clear = useQuestNoticeStore((state) => state.clear);
  const focus = useQuestNoticeStore((state) => state.focus);
  const setView = useShellStore((state) => state.setView);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const id = window.setTimeout(clear, notice.done ? 4_200 : 3_200);
    return () => window.clearTimeout(id);
  }, [notice, clear]);

  const pct = notice ? Math.round(notice.to * 100) : 0;
  const ringColor = notice?.done
    ? "var(--color-success)"
    : `color-mix(in srgb, var(--color-success) ${pct}%, var(--color-mutedText))`;

  return (
    <AnimatePresence>
      {notice ? (
        <motion.button
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="quest-toast"
          data-done={notice.done || undefined}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          initial={{ opacity: 0, y: 18, scale: 0.94 }}
          key={notice.seriesId}
          onClick={() => {
            focus(notice.seriesId);
            setView("quests");
            clear();
          }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          type="button"
        >
          <span className="quest-toast__ring-wrap">
            <svg aria-hidden className="quest-toast__ring" viewBox="0 0 36 36">
              <circle className="quest-toast__ring-track" cx="18" cy="18" r="15.5" />
              <motion.circle
                animate={{ strokeDasharray: `${Math.max(2, notice.to * 100)} 100` }}
                className="quest-toast__ring-fill"
                cx="18"
                cy="18"
                initial={{ strokeDasharray: `${Math.max(2, notice.from * 100)} 100` }}
                pathLength={100}
                r="15.5"
                style={{ stroke: ringColor }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            </svg>
            <span className="quest-toast__ring-center">
              {notice.done ? (
                <motion.span
                  animate={{ scale: 1 }}
                  initial={{ scale: 0 }}
                  style={{ display: "inline-flex" }}
                  transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.35 }}
                >
                  <Check size={14} strokeWidth={3} />
                </motion.span>
              ) : (
                <notice.icon size={12} />
              )}
            </span>
          </span>
          <span className="quest-toast__body">
            <strong>{notice.title}</strong>
            <span className="quest-toast__progress">
              {notice.done ? "Quest complete — claim it!" : `${notice.value.toLocaleString()} / ${notice.target.toLocaleString()}`}
            </span>
          </span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}

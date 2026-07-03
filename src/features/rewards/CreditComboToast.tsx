import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Zap } from "lucide-react";
import { CountUp } from "../../components/CountUp/CountUp";
import { useCreditComboStore } from "./creditCombo.store";
import "./CreditComboToast.css";

/** Frenzy palette — the text stroke cycles through it on every gain. */
const COMBO_COLORS = ["#35d0c0", "#ffb84d", "#ff5c8a", "#b970ff", "#4cc2ff", "#ffe14d"];

/** How long the ring takes to drain (refilled by every new gain). */
const HOLD_MS = 3_200;

/**
 * Credit-gain notification: accumulates every gain while open, restrokes the
 * number in a new color per iteration, can jackpot at combo ≥ 2, and dies when
 * its countdown ring fully drains.
 */
export function CreditComboToast() {
  const combo = useCreditComboStore((state) => state.combo);
  const bonus = useCreditComboStore((state) => state.bonus);
  const finishCombo = useCreditComboStore((state) => state.finishCombo);
  const clearBonus = useCreditComboStore((state) => state.clearBonus);
  const color = combo ? COMBO_COLORS[(combo.combo - 1) % COMBO_COLORS.length] : COMBO_COLORS[0];

  return createPortal(
    <AnimatePresence>
      {bonus ? (
        <motion.div
          animate={{ y: 0, opacity: 1, scale: 1 }}
          aria-live="polite"
          className="credit-combo credit-combo--bonus"
          exit={{ y: -18, opacity: 0, scale: 0.94 }}
          initial={{ y: -10, opacity: 0, scale: 1.15 }}
          key={`bonus-${bonus.id}`}
          transition={{ type: "spring", stiffness: 380, damping: 20 }}
        >
          <span className="credit-combo__bonus-label">COMBO ×{bonus.comboCount} BONUS</span>
          <strong className="credit-combo__amount credit-combo__amount--bonus">
            +<CountUp from={0} value={bonus.amount} duration={500} />
          </strong>
          <span className="credit-combo__unit">credits</span>
          <svg className="credit-combo__ring" viewBox="0 0 36 36">
            <circle className="credit-combo__ring-track" cx="18" cy="18" r="15.5" />
            <circle
              className="credit-combo__ring-fill credit-combo__ring-fill--bonus"
              cx="18"
              cy="18"
              onAnimationEnd={clearBonus}
              pathLength={100}
              r="15.5"
              style={{ animationDuration: "2600ms" }}
            />
          </svg>
        </motion.div>
      ) : null}
      {combo ? (
        <motion.div
          animate={{ y: 0, opacity: 1, scale: 1 }}
          aria-live="polite"
          className="credit-combo"
          exit={{ y: -18, opacity: 0, scale: 0.94 }}
          initial={{ y: -26, opacity: 0, scale: 0.9 }}
          key={combo.id}
          style={{ "--combo-color": color } as React.CSSProperties}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
        >
          <Zap className="credit-combo__bolt" size={17} />
          <motion.strong
            animate={{ scale: 1 }}
            className="credit-combo__amount"
            initial={{ scale: 1.4 }}
            key={`amount-${combo.combo}`}
            transition={{ type: "spring", stiffness: 520, damping: 17 }}
          >
            +<CountUp value={combo.total} duration={450} />
          </motion.strong>
          <span className="credit-combo__unit">credits</span>

          {combo.combo >= 2 ? (
            <motion.span
              animate={{ scale: 1, opacity: 1 }}
              className="credit-combo__combo"
              initial={{ scale: 1.6, opacity: 0 }}
              key={`combo-${combo.combo}`}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
            >
              COMBO ×{combo.combo}
            </motion.span>
          ) : null}

          {combo.multiplied ? (
            <motion.span
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              className="credit-combo__jackpot"
              initial={{ scale: 2, rotate: -8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 15 }}
            >
              ×2 JACKPOT!
            </motion.span>
          ) : null}

          {/* Countdown ring: refills on every gain, drains to nothing → gone. */}
          <svg className="credit-combo__ring" key={`ring-${combo.combo}`} viewBox="0 0 36 36">
            <circle className="credit-combo__ring-track" cx="18" cy="18" r="15.5" />
            <circle
              className="credit-combo__ring-fill"
              cx="18"
              cy="18"
              onAnimationEnd={finishCombo}
              pathLength={100}
              r="15.5"
              style={{ animationDuration: `${HOLD_MS}ms` }}
            />
          </svg>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

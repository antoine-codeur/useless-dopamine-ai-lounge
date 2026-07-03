import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Cake, Gift, Trophy } from "lucide-react";
import { Button } from "../../components/Button/Button";
import { CountUp } from "../../components/CountUp/CountUp";
import { Celebration, useRewardStore } from "./reward.store";
import "./RewardReveal.css";

const icons = { gift: Gift, trophy: Trophy, cake: Cake };

/** Deterministic burst: 14 particles fanned around the orb. */
const PARTICLES = Array.from({ length: 14 }, (_, index) => {
  const angle = (index / 14) * Math.PI * 2;
  const distance = 84 + (index % 3) * 26;
  return {
    x: Math.round(Math.cos(angle) * distance),
    y: Math.round(Math.sin(angle) * distance),
    color: ["var(--color-primary)", "var(--color-secondary)", "var(--color-warning)"][index % 3],
  };
});

function RewardScene({ celebration, onClose }: { celebration: Celebration; onClose: () => void }) {
  const reducedMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const [phase, setPhase] = useState<"charge" | "reveal">(reducedMotion ? "reveal" : "charge");
  const Icon = icons[celebration.icon];

  useEffect(() => {
    if (phase === "reveal") {
      return;
    }

    const id = window.setTimeout(() => setPhase("reveal"), 950);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      animate={{ opacity: 1 }}
      aria-label={celebration.title}
      aria-modal="true"
      className="reward-backdrop"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onMouseDown={onClose}
      role="dialog"
    >
      <div className="reward-stage" onMouseDown={(event) => event.stopPropagation()}>
        <div className="reward-orb-area">
          {phase === "reveal" && !reducedMotion
            ? PARTICLES.map((particle, index) => (
                <motion.span
                  animate={{ x: particle.x, y: particle.y, opacity: [0, 1, 0], scale: [0.4, 1, 0.5] }}
                  className="reward-particle"
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                  key={index}
                  style={{ background: particle.color }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              ))
            : null}
          <motion.div
            animate={
              phase === "charge"
                ? { scale: 1, rotate: [0, -7, 7, -5, 5, -2, 0] }
                : { scale: [1, 1.18, 1], rotate: 0 }
            }
            className="reward-orb"
            initial={{ scale: reducedMotion ? 1 : 0 }}
            transition={
              phase === "charge"
                ? { scale: { type: "spring", stiffness: 320, damping: 17 }, rotate: { duration: 0.9, ease: "easeInOut" } }
                : { duration: 0.45, ease: "easeOut" }
            }
          >
            <Icon size={40} />
          </motion.div>
        </div>

        <AnimatePresence>
          {phase === "reveal" ? (
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="reward-result"
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 360, damping: 24 }}
            >
              <strong className="reward-amount">
                +<CountUp from={0} value={celebration.credits} duration={900} /> credits
              </strong>
              <span className="reward-title">{celebration.title}</span>
              <Button onClick={onClose} type="button">
                Collect
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/** Full-screen reward celebration host. Mount once at the app root. */
export function RewardReveal() {
  const celebration = useRewardStore((state) => state.celebration);
  const clear = useRewardStore((state) => state.clear);

  return createPortal(
    <AnimatePresence>
      {celebration ? <RewardScene celebration={celebration} key={celebration.id} onClose={clear} /> : null}
    </AnimatePresence>,
    document.body,
  );
}

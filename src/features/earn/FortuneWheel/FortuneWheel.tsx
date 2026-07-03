import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import type { Account } from "../../../types";
import { spinWheel, type WheelReward } from "../../../lib/api";
import { applyAccountResult } from "../../profile/account.store";
import { addSeasonXp } from "../../season/season.store";
import { celebrate } from "../../rewards/reward.store";
import { showToast } from "../../../components/Toast/toast.store";
import { FIRST_SPIN_SEGMENT_ID, todayKey, WHEEL_INDEX_BY_ID, WHEEL_SEGMENT_ANGLE, WHEEL_SEGMENTS } from "../wheel";
import "./FortuneWheel.css";

const CENTER = 100;
const RADIUS = 100;

function pointOnCircle(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.sin(rad), y: CENTER - radius * Math.cos(rad) };
}

function slicePath(index: number) {
  const start = pointOnCircle(index * WHEEL_SEGMENT_ANGLE, RADIUS);
  const end = pointOnCircle((index + 1) * WHEEL_SEGMENT_ANGLE, RADIUS);
  return `M ${CENTER} ${CENTER} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

/** Daily fortune wheel. Accounts get a server-drawn reward once per day; guests
 *  can spin as a teaser but are nudged to sign in (no reward is granted). */
export function FortuneWheel({ account, onRequireAuth }: { account: Account | null; onRequireAuth: () => void }) {
  const reduced = useReducedMotion();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spunToday, setSpunToday] = useState(account?.wheelSpinDay === todayKey());
  const rotationRef = useRef(0);
  const settleRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setSpunToday(account?.wheelSpinDay === todayKey());
  }, [account?.wheelSpinDay]);

  function runSettle() {
    const settle = settleRef.current;
    settleRef.current = null;
    settle?.();
  }

  function animateTo(index: number, onSettle: () => void) {
    const jitter = Math.random() * (WHEEL_SEGMENT_ANGLE * 0.6) - WHEEL_SEGMENT_ANGLE * 0.3;
    const targetMod = (((-(index * WHEEL_SEGMENT_ANGLE + WHEEL_SEGMENT_ANGLE / 2) + jitter) % 360) + 360) % 360;

    if (reduced) {
      rotationRef.current = targetMod;
      setRotation(targetMod);
      onSettle();
      return;
    }

    const currentMod = ((rotationRef.current % 360) + 360) % 360;
    const delta = 360 * 5 + (((targetMod - currentMod) % 360) + 360) % 360;
    rotationRef.current += delta;
    settleRef.current = onSettle;
    setRotation(rotationRef.current);
  }

  function applyReward(reward: WheelReward) {
    if (reward.kind === "credits") {
      celebrate({ title: reward.amount >= 200 ? "JACKPOT !" : "Roue de la fortune", credits: reward.amount, icon: "trophy" });
    } else if (reward.kind === "booster") {
      showToast({ variant: "success", title: `+${reward.amount} booster${reward.amount > 1 ? "s" : ""}`, description: "À ouvrir dans la boutique." });
    } else if (reward.kind === "xp") {
      addSeasonXp(reward.amount);
      showToast({ variant: "success", title: `+${reward.amount} XP`, description: "Progression du Pass mise à jour." });
    } else {
      showToast({ variant: "info", title: "Dommage…", description: "Pas de gain aujourd'hui — retente demain !" });
    }
  }

  async function spin() {
    if (spinning || spunToday) {
      return;
    }

    setSpinning(true);

    // Guests spin for the thrill only — the result is discarded and they're
    // invited to sign in. No server call, so nothing can be granted.
    if (!account) {
      // Land the teaser on the guaranteed first-spin reward, so the nudge can
      // promise exactly what they'll get on their real first spin.
      animateTo(WHEEL_INDEX_BY_ID[FIRST_SPIN_SEGMENT_ID] ?? 0, () => {
        setSpinning(false);
        showToast({ variant: "info", title: "Crée un compte pour réclamer +50 crédits", description: "Ton premier tour est garanti gagnant." });
        onRequireAuth();
      });
      return;
    }

    const result = await spinWheel();

    if (!result.ok) {
      setSpinning(false);
      if (result.error === "already_spun") {
        setSpunToday(true);
      } else {
        showToast({ variant: "warning", title: "Spin impossible", description: "Réessaie dans un instant." });
      }
      return;
    }

    animateTo(WHEEL_INDEX_BY_ID[result.segmentId] ?? 0, () => {
      setSpinning(false);
      setSpunToday(true);
      applyAccountResult(result);
      applyReward(result.reward);
    });
  }

  const status = spinning
    ? "La chance tourne…"
    : !account
      ? "Tour quotidien — connecte-toi pour gagner"
      : spunToday
        ? "Reviens demain pour un nouveau tour ✨"
        : "Un tour gratuit chaque jour";

  return (
    <div className="fortune">
      <div className="fortune__stage" data-spinning={spinning || undefined}>
        <span className="fortune__pointer" aria-hidden />
        <svg
          className="fortune__disc"
          viewBox="0 0 200 200"
          style={{ transform: `rotate(${rotation}deg)`, transition: reduced ? "none" : undefined }}
          onTransitionEnd={runSettle}
          aria-hidden
        >
          {WHEEL_SEGMENTS.map((segment, index) => (
            <path className="fortune__slice" d={slicePath(index)} data-index={index} data-kind={segment.kind} key={segment.id} />
          ))}
          {WHEEL_SEGMENTS.map((segment, index) => {
            const mid = index * WHEEL_SEGMENT_ANGLE + WHEEL_SEGMENT_ANGLE / 2;
            const pos = pointOnCircle(mid, 64);
            return (
              <text
                className="fortune__label"
                dominantBaseline="middle"
                key={segment.id}
                textAnchor="middle"
                transform={`rotate(${mid} ${pos.x.toFixed(2)} ${pos.y.toFixed(2)})`}
                x={pos.x.toFixed(2)}
                y={pos.y.toFixed(2)}
              >
                {segment.label}
              </text>
            );
          })}
        </svg>
        <button className="fortune__hub" disabled={spinning || spunToday} onClick={spin} type="button" aria-label="Tourner la roue de la fortune">
          {spunToday && account ? <Check size={20} /> : spinning ? <Sparkles size={20} /> : "SPIN"}
        </button>
      </div>
      <p className="fortune__status">{status}</p>
    </div>
  );
}

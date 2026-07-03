import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Puzzle } from "lucide-react";
import { Button } from "../../components/Button/Button";
import { CountUp } from "../../components/CountUp/CountUp";
import { useAccountStore } from "../profile/account.store";
import { bumpQuest } from "../quests/quest.store";
import { useBoosterPuzzleStore } from "./puzzle.store";
import { creditGain } from "./creditCombo.store";
import { recordCredit } from "../stats/ledger.store";
import { boostGain } from "../../lib/planPerks";
import { nextBoosterFloor, useShopStore } from "../shop/shop.store";
import "./BoosterPuzzle.css";

const RARITIES = [
  { id: "common", label: "Common", color: "#9aa5b1", bonus: 0 },
  { id: "uncommon", label: "Uncommon", color: "#57d98a", bonus: 15 },
  { id: "rare", label: "Rare", color: "#4cc2ff", bonus: 40 },
  { id: "epic", label: "Epic", color: "#b970ff", bonus: 80 },
  { id: "legendary", label: "Legendary", color: "#ffc73d", bonus: 300 },
  { id: "mythic", label: "MYTHIC", color: "#ff5c8a", bonus: 2000 },
];

/** Frenzy taps are upgrade CHANCES, not guarantees — mythic is the jackpot. */
const UPGRADE_CHANCE = [0.55, 0.4, 0.28, 0.16, 0.04];

/** Pastel pieces, straight from the mockup. */
const PIECE_COLORS = ["#cdb9f7", "#f7cf9e", "#bfe6bd", "#b7d7f5"];
const FRENZY_WINDOW_MS = 2_000;

const PARTICLES = Array.from({ length: 16 }, (_, index) => {
  const angle = (index / 16) * Math.PI * 2;
  const distance = 90 + (index % 4) * 24;
  return { x: Math.round(Math.cos(angle) * distance), y: Math.round(Math.sin(angle) * distance) };
});

/** Weighted rarity roll for the non-tapped boosters of a x10 opening.
    Mythic sits at 0.5% — it pays 2000, it has to be a jackpot. */
const ROLL_WEIGHTS = [80, 52, 34, 20, 13, 1];

function rollStage(): number {
  const total = ROLL_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
  let ticket = Math.random() * total;

  for (let index = 0; index < ROLL_WEIGHTS.length; index++) {
    ticket -= ROLL_WEIGHTS[index];

    if (ticket <= 0) {
      return index;
    }
  }

  return 0;
}

function PuzzleScene({ bases, floor, onClose }: { bases: number[]; floor: number; onClose: () => void }) {
  const plans = useAccountStore((state) => state.plans);
  const quests = useAccountStore((state) => state.quests);
  const setAccount = useAccountStore((state) => state.setAccount);
  const [placed, setPlaced] = useState(0);
  const [stage, setStage] = useState(floor);
  const [results, setResults] = useState<number[]>([]);
  const [phase, setPhase] = useState<"pieces" | "frenzy" | "reveal">("pieces");
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number; char: string }[]>([]);
  const frenzyTimer = useRef<number | null>(null);
  const stageRef = useRef(floor);
  const sparkIdRef = useRef(0);
  const boardControls = useAnimationControls();
  const rarity = RARITIES[stage];

  /** Every tap sprays a spark and jolts the board — pure feedback candy. */
  function tapCandy(intense: boolean) {
    navigator.vibrate?.(intense ? 22 : 12);
    void boardControls.start({
      rotate: [0, intense ? -2.2 : -1.1, intense ? 2.2 : 1.1, 0],
      scale: [1, intense ? 1.06 : 1.03, 1],
      transition: { duration: 0.16, ease: "easeOut" },
    });
    const id = ++sparkIdRef.current;
    const spark = {
      id,
      x: Math.round((Math.random() - 0.5) * 170),
      y: Math.round(-20 - Math.random() * 60),
      char: ["✦", "＋", "★", "✧"][id % 4],
    };
    setSparks((current) => [...current.slice(-7), spark]);
    window.setTimeout(() => setSparks((current) => current.filter((entry) => entry.id !== id)), 650);
  }

  useEffect(() => {
    // Board entrance spring (controls own the board from then on).
    void boardControls.start({ scale: 1, transition: { type: "spring", stiffness: 260, damping: 20 } });
    return () => {
      if (frenzyTimer.current) {
        window.clearTimeout(frenzyTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- entrance once
  }, []);

  function finalize() {
    const shop = useShopStore.getState();
    // Booster #1 = the tapped rarity; the rest of a x10 roll with pity floors.
    const finalResults = bases.map((_, index) => {
      if (index === 0) {
        shop.recordOpening(stageRef.current);
        return stageRef.current;
      }

      const rolled = Math.max(rollStage(), nextBoosterFloor());
      shop.recordOpening(rolled);
      return rolled;
    });

    finalResults.forEach((resultStage) => {
      if (resultStage === RARITIES.length - 1) {
        bumpQuest("mythic-pulls");
      } else if (resultStage === RARITIES.length - 2) {
        bumpQuest("legendary-pulls");
      }
    });

    const rawBonus = finalResults.reduce((sum, resultStage) => sum + RARITIES[resultStage].bonus, 0);
    const totalBonus = boostGain(rawBonus, useAccountStore.getState().account?.plan);

    if (totalBonus > 0) {
      const current = useAccountStore.getState().account;

      if (current) {
        setAccount({ ...current, creditsRemaining: current.creditsRemaining + totalBonus }, plans, quests);
      }

      bumpQuest("credits-earned", totalBonus);
      recordCredit(totalBonus, `Rarity bonus ×${finalResults.length}`, "booster");
      creditGain(totalBonus);
    }

    setResults(finalResults);
    navigator.vibrate?.([30, 40, 70]);
    setPhase("reveal");
  }

  function handleTap() {
    if (phase === "reveal") {
      return;
    }

    bumpQuest("puzzle-taps");
    tapCandy(phase === "frenzy");

    if (phase === "pieces") {
      const next = placed + 1;
      setPlaced(next);

      if (next >= 4) {
        // FRENZY: every extra tap upgrades the rarity before it bursts open.
        setPhase("frenzy");
        frenzyTimer.current = window.setTimeout(finalize, FRENZY_WINDOW_MS);
      }

      return;
    }

    // Frenzy tap: roll against the current rank's upgrade chance. The climb
    // gets brutal near the top — reaching MYTHIC is a genuine jackpot.
    setStage((value) => {
      if (value >= RARITIES.length - 1 || Math.random() >= (UPGRADE_CHANCE[value] ?? 0)) {
        return value;
      }

      const next = value + 1;
      stageRef.current = next;
      return next;
    });
  }

  const totalBase = bases.reduce((sum, base) => sum + base, 0);
  const totalBonus = boostGain(
    results.reduce((sum, resultStage) => sum + RARITIES[resultStage].bonus, 0),
    useAccountStore.getState().account?.plan,
  );
  const total = totalBase + totalBonus;
  const bestStage = results.length > 0 ? Math.max(...results) : stage;
  const bestRarity = RARITIES[bestStage];

  return (
    <motion.div animate={{ opacity: 1 }} aria-modal="true" className="puzzle-backdrop" exit={{ opacity: 0 }} initial={{ opacity: 0 }} role="dialog" aria-label="Booster opening">
      <div className="puzzle-stage" onPointerDown={handleTap} style={{ "--rarity-color": rarity.color } as React.CSSProperties}>
        {phase !== "reveal" ? (
          <>
            {/* Rarity flash washes the screen at every upgrade. */}
            <AnimatePresence>
              {phase === "frenzy" && stage > 0 ? (
                <motion.div
                  animate={{ opacity: 0 }}
                  className="puzzle-flash"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0.45 }}
                  key={`flash-${stage}`}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              ) : null}
            </AnimatePresence>

            {/* Tap sparks fly above the board. */}
            <div className="puzzle-sparks" aria-hidden="true">
              <AnimatePresence>
                {sparks.map((spark) => (
                  <motion.span
                    animate={{ opacity: [0, 1, 0], y: spark.y - 46, scale: 1.1 }}
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0, x: spark.x, y: spark.y, scale: 0.4 }}
                    key={spark.id}
                    style={{ x: spark.x }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  >
                    {spark.char}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>

            <motion.div
              animate={boardControls}
              className="puzzle-board"
              data-frenzy={phase === "frenzy" || undefined}
              initial={{ scale: 0.6, opacity: 1 }}
            >
              {PIECE_COLORS.map((color, index) => (
                <div className="puzzle-slot" key={index}>
                  <AnimatePresence>
                    {placed > index ? (
                      <motion.div
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        className="puzzle-piece"
                        initial={{ scale: 0.25, rotate: index % 2 ? 14 : -14, opacity: 0 }}
                        style={{ background: color }}
                        transition={{ type: "spring", stiffness: 420, damping: 18 }}
                      />
                    ) : null}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>

            {phase === "frenzy" ? (
              <>
                <div className="puzzle-frenzy-track" key={`track-${placed}`}>
                  <span style={{ animationDuration: `${FRENZY_WINDOW_MS}ms` }} />
                </div>
                <AnimatePresence mode="popLayout">
                  <motion.strong
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="puzzle-rarity"
                    exit={{ opacity: 0, scale: 1.4 }}
                    initial={{ opacity: 0, scale: 0.7, y: 8 }}
                    key={rarity.id}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  >
                    {rarity.label}
                  </motion.strong>
                </AnimatePresence>
                {stage > 0 ? (
                  <motion.span
                    animate={{ scale: 1, opacity: 1 }}
                    className="puzzle-combo"
                    initial={{ scale: 1.6, opacity: 0 }}
                    key={`combo-${stage}`}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  >
                    COMBO ×{stage}
                  </motion.span>
                ) : null}
                <p className="puzzle-hint puzzle-hint--frenzy">TAP TAP TAP to upgrade!</p>
              </>
            ) : (
              <p className="puzzle-hint">Tap to place the pieces ({placed}/4)</p>
            )}
          </>
        ) : (
          <motion.div animate={{ opacity: 1, scale: 1 }} className="puzzle-result" initial={{ opacity: 0, scale: 0.85 }} transition={{ type: "spring", stiffness: 320, damping: 22 }}>
            <div className="puzzle-result__burst">
              <motion.span
                animate={{ scale: 3.4, opacity: 0 }}
                className="puzzle-ring"
                initial={{ scale: 0.3, opacity: 0.85 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
              <motion.span
                animate={{ scale: 2.4, opacity: 0 }}
                className="puzzle-ring"
                initial={{ scale: 0.2, opacity: 0.6 }}
                transition={{ delay: 0.18, duration: 0.8, ease: "easeOut" }}
              />
              {PARTICLES.map((particle, index) => (
                <motion.span
                  animate={{ x: particle.x, y: particle.y, opacity: [0, 1, 0], scale: [0.4, 1, 0.5] }}
                  initial={{ x: 0, y: 0, opacity: 0 }}
                  key={index}
                  transition={{ duration: 0.85, ease: "easeOut" }}
                />
              ))}
              <div className="puzzle-result__orb">
                <Puzzle size={26} />
              </div>
            </div>
            <strong className="puzzle-rarity puzzle-rarity--final" style={{ "--rarity-color": bestRarity.color } as React.CSSProperties}>
              {bases.length > 1 ? `Best: ${bestRarity.label}!` : `${RARITIES[results[0] ?? stage].label} booster!`}
            </strong>
            {bases.length > 1 ? (
              <div className="puzzle-result__grid">
                {results.map((resultStage, index) => (
                  <motion.span
                    animate={{ scale: 1, opacity: 1 }}
                    initial={{ scale: 0.4, opacity: 0 }}
                    key={index}
                    style={{ background: RARITIES[resultStage].color }}
                    transition={{ delay: index * 0.07, type: "spring", stiffness: 420, damping: 20 }}
                  >
                    {RARITIES[resultStage].label.slice(0, 1)}
                  </motion.span>
                ))}
              </div>
            ) : null}
            <span className="puzzle-result__credits">
              +<CountUp from={0} value={total} duration={900} /> credits
            </span>
            <small>
              {totalBase} base{totalBonus > 0 ? ` + ${totalBonus} rarity bonus` : ""}
              {bases.length > 1 ? ` · ${bases.length} boosters` : ""}
            </small>
            <Button onClick={onClose} type="button">
              Collect
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/** Booster-opening puzzle host. Mount once at the app root. */
export function BoosterPuzzle() {
  const session = useBoosterPuzzleStore((state) => state.session);
  const closePuzzle = useBoosterPuzzleStore((state) => state.closePuzzle);

  return createPortal(
    <AnimatePresence>
      {session ? <PuzzleScene bases={session.bases} floor={session.floor} key={session.id} onClose={closePuzzle} /> : null}
    </AnimatePresence>,
    document.body,
  );
}

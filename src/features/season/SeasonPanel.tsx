import { CalendarCheck, Check, Crown, Flame, Lock, Zap } from "lucide-react";
import { Button } from "../../components/Button/Button";
import { showToast } from "../../components/Toast/toast.store";
import { GuestPanel } from "../account/GuestPanel";
import { useAccountStore } from "../profile/account.store";
import { creditGain } from "../rewards/creditCombo.store";
import { celebrate } from "../rewards/reward.store";
import { recordCredit } from "../stats/ledger.store";
import { recordPurchase } from "../shop/purchases.store";
import { bumpQuest } from "../quests/quest.store";
import { boostGain } from "../../lib/planPerks";
import {
  freeRewardFor,
  LEVEL_XP,
  levelFor,
  PREMIUM_PASS_PRICE,
  premiumRewardFor,
  SEASON_TIERS,
  seasonLabel,
  useSeasonStore,
} from "./season.store";
import "./SeasonPanel.css";

/** Full-dopamine season pass: check-ins feed XP, tiers pay credits. */
export function SeasonPanel({ onCreateAccount, onLogin }: { onCreateAccount: () => void; onLogin: () => void }) {
  const account = useAccountStore((state) => state.account);
  const plans = useAccountStore((state) => state.plans);
  const quests = useAccountStore((state) => state.quests);
  const setAccount = useAccountStore((state) => state.setAccount);
  const seasonId = useSeasonStore((state) => state.seasonId);
  const xp = useSeasonStore((state) => state.xp);
  const premium = useSeasonStore((state) => state.premium);
  const claims = useSeasonStore((state) => state.claims);
  const streak = useSeasonStore((state) => state.streak);
  const lastCheckInDay = useSeasonStore((state) => state.lastCheckInDay);

  if (!account) {
    return (
      <GuestPanel
        icon={<Crown size={22} />}
        title="The season pass needs an account"
        text="XP, check-in streaks and tier rewards persist on your account."
        onCreate={onCreateAccount}
        onLogin={onLogin}
      />
    );
  }

  const level = levelFor(xp);
  const intoLevel = xp - (level - 1) * LEVEL_XP;
  const checkedInToday = lastCheckInDay === new Date().toISOString().slice(0, 10);

  function grant(amount: number, reason: string) {
    const current = useAccountStore.getState().account;

    if (!current) {
      return;
    }

    const boosted = boostGain(amount, current.plan);
    setAccount({ ...current, creditsRemaining: current.creditsRemaining + boosted }, plans, quests);
    bumpQuest("credits-earned", boosted);
    recordCredit(boosted, reason, "season");
    creditGain(boosted);
  }

  function handleCheckIn() {
    const gained = useSeasonStore.getState().checkIn();

    if (gained === 0) {
      showToast({ variant: "info", title: "Already checked in", description: "Come back tomorrow to keep the streak alive." });
      return;
    }

    const { streak: newStreak } = useSeasonStore.getState();
    celebrate({ title: `Day ${newStreak} check-in!`, credits: 0, icon: "trophy" });
    showToast({ variant: "success", title: `+${gained} XP`, description: newStreak > 1 ? `Streak ×${newStreak} — longer streaks pay more XP.` : "Come back tomorrow — streaks pay more XP." });
  }

  function handleClaim(tier: number, track: "free" | "premium") {
    if (!useSeasonStore.getState().claimTier(tier, track)) {
      return;
    }

    const amount = track === "free" ? freeRewardFor(tier) : premiumRewardFor(tier);
    bumpQuest("season-claims");
    grant(amount, `Season tier ${tier} (${track})`);
  }

  function handleUpgrade() {
    const current = useAccountStore.getState().account;

    if (!current || premium) {
      return;
    }

    if (current.creditsRemaining < PREMIUM_PASS_PRICE) {
      showToast({
        variant: "warning",
        title: `Missing ${(PREMIUM_PASS_PRICE - current.creditsRemaining).toLocaleString()} credits`,
        description: `The premium pass costs ${PREMIUM_PASS_PRICE.toLocaleString()} credits.`,
      });
      return;
    }

    setAccount({ ...current, creditsRemaining: current.creditsRemaining - PREMIUM_PASS_PRICE }, plans, quests);
    useSeasonStore.getState().unlockPremium();
    bumpQuest("credits-spent", PREMIUM_PASS_PRICE);
    recordCredit(-PREMIUM_PASS_PRICE, "Premium season pass", "purchase");
    recordPurchase({ kind: "season", refId: seasonId, label: `Premium pass · ${seasonLabel(seasonId)}`, price: PREMIUM_PASS_PRICE, refundable: false });
    celebrate({ title: "Premium pass unlocked!", credits: 0, icon: "trophy" });
  }

  const tiers = Array.from({ length: SEASON_TIERS }, (_, index) => index + 1);

  return (
    <section className="content-panel season-panel">
      <div className="page-heading">
        <div>
          <h3>Season pass</h3>
          <p className="muted">Season · {seasonLabel(seasonId)} — check in daily, climb tiers, cash credits.</p>
        </div>
      </div>

      <section className="season-hero">
        <div className="season-hero__level">
          <Crown size={22} />
          <strong>{level}</strong>
          <span>level</span>
        </div>
        <div className="season-hero__meta">
          <div className="season-hero__bar" role="progressbar" aria-valuemax={LEVEL_XP} aria-valuemin={0} aria-valuenow={intoLevel}>
            <span style={{ width: `${Math.min(100, Math.round((intoLevel / LEVEL_XP) * 100))}%` }} />
            <small>
              {intoLevel}/{LEVEL_XP} XP {level < SEASON_TIERS ? `· level ${level + 1} next` : "· max level!"}
            </small>
          </div>
          <p className="muted">Prompts, quests, boosters and check-ins all feed the pass.</p>
        </div>
        <div className="season-hero__checkin">
          <span className="season-streak" data-hot={streak > 1 || undefined}>
            <Flame size={14} /> {streak > 0 ? `${streak}-day streak` : "no streak yet"}
          </span>
          <Button disabled={checkedInToday} onClick={handleCheckIn} type="button" variant={checkedInToday ? "secondary" : "primary"}>
            {checkedInToday ? (
              <>
                <Check size={15} /> Checked in
              </>
            ) : (
              <>
                <CalendarCheck size={15} /> Daily check-in
              </>
            )}
          </Button>
        </div>
      </section>

      {!premium ? (
        <section className="season-upsell">
          <Crown size={17} />
          <p>
            <strong>Premium track</strong> — double-plus rewards on every tier, all season.
          </p>
          <Button onClick={handleUpgrade} type="button">
            Upgrade · {PREMIUM_PASS_PRICE.toLocaleString()} <Zap size={12} />
          </Button>
        </section>
      ) : null}

      <div className="season-track">
        {tiers.map((tier) => {
          const reached = level >= tier;
          const freeClaimed = !!claims[`${tier}:free`];
          const premiumClaimed = !!claims[`${tier}:premium`];

          return (
            <article className="season-tier" data-reached={reached || undefined} key={tier}>
              <header>
                <strong>{tier}</strong>
              </header>
              <button
                className="season-reward"
                data-claimed={freeClaimed || undefined}
                disabled={!reached || freeClaimed}
                onClick={() => handleClaim(tier, "free")}
                type="button"
              >
                {freeClaimed ? <Check size={12} /> : null}
                {freeRewardFor(tier)} <Zap size={11} />
              </button>
              <button
                className="season-reward season-reward--premium"
                data-claimed={premiumClaimed || undefined}
                disabled={!reached || !premium || premiumClaimed}
                onClick={() => handleClaim(tier, "premium")}
                type="button"
              >
                {premiumClaimed ? <Check size={12} /> : !premium ? <Lock size={11} /> : null}
                {premiumRewardFor(tier)} <Zap size={11} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

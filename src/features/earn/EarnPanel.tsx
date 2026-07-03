import { CalendarDays, Gift, ShieldCheck, Trophy } from "lucide-react";
import { Button } from "../../components/Button/Button";
import { GuestPanel } from "../account/GuestPanel";
import { canClaimBirthday } from "../account/helpers";
import { useAccountStore } from "../profile/account.store";
import type { Quest } from "../../types";

type EarnPanelProps = {
  onOpenBooster: () => void;
  onClaimBirthday: () => void;
  onClaimQuest: (questId: Quest["id"]) => void;
  onCreateAccount: () => void;
  onLogin: () => void;
};

/** Rewards hub: boosters, birthday gift, and claimable quests. Guests see a CTA. */
export function EarnPanel({ onOpenBooster, onClaimBirthday, onClaimQuest, onCreateAccount, onLogin }: EarnPanelProps) {
  const account = useAccountStore((state) => state.account);
  const quests = useAccountStore((state) => state.quests);

  if (!account) {
    return (
      <GuestPanel
        icon={<Gift size={22} />}
        title="Earn with an account"
        text="Guests get a real free credit pool. Quests, boosters, birthday rewards, and plan unlocks need an account so the rewards can persist."
        onCreate={onCreateAccount}
        onLogin={onLogin}
      />
    );
  }

  return (
    <section className="content-panel">
      <h3>Earn credits</h3>
      <p className="muted">Credits come from real actions: daily check-ins, quests, boosters, usage milestones, and an optional birthday reward.</p>
      <div className="earn-grid">
        <article className="earn-card">
          <Gift size={20} />
          <strong>Open boosters</strong>
          <span>{account.boosters} available</span>
          <Button onClick={onOpenBooster} type="button" variant="secondary">Open booster</Button>
        </article>
        <article className="earn-card">
          <CalendarDays size={20} />
          <strong>Birthday gift</strong>
          <span>{account.birthDate ? "Available once per year on your birthday." : "Add your date of birth in Profile to enable it."}</span>
          <Button disabled={!canClaimBirthday(account)} onClick={onClaimBirthday} type="button" variant="secondary">Claim gift</Button>
        </article>
        <article className="earn-card">
          <Trophy size={20} />
          <strong>Quest guide</strong>
          <span>Complete actions, claim credits, unlock higher plans.</span>
        </article>
        <article className="earn-card">
          <ShieldCheck size={20} />
          <strong>How to gain credits</strong>
          <span>Check in daily, open earned boosters, send prompts, and complete one-time milestones.</span>
        </article>
      </div>
      <div className="quest-list">
        {quests.map((quest) => {
          const claimed = account.questClaims?.[quest.id];
          return (
            <button className="quest-card" disabled={!!claimed && quest.repeat !== "daily"} key={quest.id} onClick={() => onClaimQuest(quest.id)} type="button">
              <span>{quest.label}</span>
              <strong>+{quest.rewardCredits}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}

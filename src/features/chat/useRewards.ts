import type { Account } from "../../types";
import { claimBirthdayGift, claimQuest, openBooster, updateAccount } from "../../lib/api";
import { recordCredit } from "../stats/ledger.store";
import { addSeasonXp } from "../season/season.store";
import { applyAccountResult, useAccountStore } from "../profile/account.store";
import { useShellStore } from "../shell/shell.store";
import { showToast } from "../../components/Toast/toast.store";
import { bumpQuest } from "../quests/quest.store";
import { celebrate } from "../rewards/reward.store";
import { openBoosterPuzzle } from "../rewards/puzzle.store";
import { creditGain } from "../rewards/creditCombo.store";
import { nextBoosterFloor } from "../shop/shop.store";

type UseRewardsArgs = {
  account: Account | null;
  billingCycle: Account["planBillingCycle"];
  setLimitReached: (value: boolean) => void;
  openAuth: (mode: "signup" | "login", message?: string) => void;
};

/** Owns the reward/monetization flows: choosing a plan, claiming quests and the
 *  birthday gift, and opening a credit booster. Plan/limit UI state stays in
 *  ChatPage (shared with the plans view) and is passed in. */
export function useRewards({ account, billingCycle, setLimitReached, openAuth }: UseRewardsArgs) {
  const plans = useAccountStore((state) => state.plans);
  const setView = useShellStore((state) => state.setView);

  async function choosePlan(planId: Account["plan"]) {
    if (!account) {
      setLimitReached(false);
      openAuth("signup", `Create an account to unlock ${plans.find((plan) => plan.id === planId)?.label ?? "a plan"} with credits.`);
      return;
    }

    const planChanged = planId !== account.plan || billingCycle !== account.planBillingCycle;
    const result = await updateAccount({ plan: planId, billingCycle });

    if (result.ok) {
      const upgradeCost = (plans.find((plan) => plan.id === planId)?.upgradeCost ?? 0) * (billingCycle === "yearly" ? 10 : 1);

      if (planChanged && upgradeCost > 0) {
        recordCredit(-upgradeCost, `Plan: ${plans.find((plan) => plan.id === planId)?.label ?? planId}`, "plan");
      }

      applyAccountResult(result);
      setLimitReached(false);
      setView("chat");
      return;
    }

    if (result.error === "upgrade_credit_limit" && result.account) {
      applyAccountResult(result);
      setLimitReached(true);
    }
  }

  async function claim(questId: "daily-check-in" | "open-first-booster" | "send-three-prompts") {
    const result = await claimQuest(questId);

    if (!result.ok) {
      showToast({ variant: "warning", title: "Quest not ready yet", description: "Complete the action first, then claim." });
      return;
    }

    applyAccountResult(result);
    bumpQuest("dailies");
    bumpQuest("credits-earned", result.rewardCredits);
    recordCredit(result.rewardCredits, `Quest: ${result.quests.find((quest) => quest.id === questId)?.label ?? questId}`, "quest");
    addSeasonXp(10);
    creditGain(result.rewardCredits);
    celebrate({ title: "Quest complete!", credits: result.rewardCredits, icon: "trophy" });
  }

  async function openCreditBooster() {
    const result = await openBooster();

    if (!result.ok) {
      showToast({ variant: "warning", title: "No boosters available", description: "Complete quests to earn more." });
      return;
    }

    applyAccountResult(result);
    bumpQuest("boosters");
    bumpQuest("credits-earned", result.rewardCredits);
    recordCredit(result.rewardCredits, "Booster opening", "booster");
    addSeasonXp(10);
    creditGain(result.rewardCredits);
    // The booster opens as a tappable puzzle — rarity climbs with fast taps,
    // never below the pity floor (first ever / one per batch of 10 = Rare+).
    openBoosterPuzzle([result.rewardCredits], nextBoosterFloor());
  }

  async function claimBirthday() {
    const result = await claimBirthdayGift();

    if (!result.ok) {
      showToast({ variant: "warning", title: "Birthday gift not available today", description: "It unlocks once a year, on your birthday." });
      return;
    }

    applyAccountResult(result);
    bumpQuest("credits-earned", result.rewardCredits);
    recordCredit(result.rewardCredits, "Birthday gift", "gift");
    creditGain(result.rewardCredits);
    celebrate({ title: "Happy birthday!", credits: result.rewardCredits, icon: "cake" });
  }

  return { choosePlan, claim, openCreditBooster, claimBirthday };
}

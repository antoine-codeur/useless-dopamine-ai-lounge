import { showToast } from "../../components/Toast/toast.store";
import { useShellStore } from "../shell/shell.store";
import { useAccountStore } from "../profile/account.store";
import { useUserStore } from "../profile/profile.store";
import { recordCredit } from "../stats/ledger.store";
import { recordPurchase } from "../shop/purchases.store";
import { bumpQuest } from "../quests/quest.store";
import type { ThemeId, ThemeMode } from "../../types";

export const THEME_UNLOCK_COST = 250;
export const POLARIZED_UNLOCK_COST = 150;

/** "Default AI" is always free; every other identity is a credit unlock. */
export function useThemeUnlock() {
  const account = useAccountStore((state) => state.account);
  const plans = useAccountStore((state) => state.plans);
  const quests = useAccountStore((state) => state.quests);
  const setAccount = useAccountStore((state) => state.setAccount);
  const user = useUserStore((state) => state.user);
  const setView = useShellStore((state) => state.setView);

  function isThemeLocked(themeId: ThemeId) {
    return themeId !== "default-ai" && !user.themes.includes(themeId);
  }

  function isModeLocked(mode: ThemeMode) {
    return mode.endsWith("polarized") && !user.polarizedUnlocked;
  }

  /** Spends credits from the account; guests are invited to sign up first. */
  function spend(cost: number, onUnlocked: () => void, what: string) {
    if (!account) {
      showToast({
        variant: "info",
        title: `${what} needs an account`,
        description: "Create an account so unlocks can persist.",
      });
      return false;
    }

    if (account.creditsRemaining < cost) {
      showToast({
        variant: "warning",
        title: `Missing ${(cost - account.creditsRemaining).toLocaleString()} credits`,
        description: `${what} costs ${cost.toLocaleString()} credits.`,
        actionLabel: "View plans",
        onAction: () => setView("plans"),
      });
      return false;
    }

    setAccount(
      { ...account, creditsRemaining: account.creditsRemaining - cost },
      plans,
      quests,
    );
    onUnlocked();
    return true;
  }

  function unlockThemeWithCredits(themeId: ThemeId, label: string) {
    return spend(THEME_UNLOCK_COST, () => {
      useUserStore.getState().unlockTheme(themeId);
      bumpQuest("credits-spent", THEME_UNLOCK_COST);
      recordCredit(-THEME_UNLOCK_COST, `Bought ${label}`, "purchase");
      recordPurchase({ kind: "theme", refId: themeId, label, price: THEME_UNLOCK_COST });
      showToast({ variant: "success", title: `${label} unlocked`, description: `-${THEME_UNLOCK_COST} credits` });
    }, `Unlocking ${label}`);
  }

  function unlockPolarizedWithCredits() {
    return spend(POLARIZED_UNLOCK_COST, () => {
      useUserStore.getState().unlockPolarized();
      bumpQuest("credits-spent", POLARIZED_UNLOCK_COST);
      recordCredit(-POLARIZED_UNLOCK_COST, "Bought high-contrast variants", "purchase");
      recordPurchase({ kind: "polarized", refId: "polarized", label: "High-contrast variants", price: POLARIZED_UNLOCK_COST });
      showToast({ variant: "success", title: "High-contrast variants unlocked", description: `-${POLARIZED_UNLOCK_COST} credits` });
    }, "Unlocking high contrast");
  }

  return { isThemeLocked, isModeLocked, unlockThemeWithCredits, unlockPolarizedWithCredits };
}

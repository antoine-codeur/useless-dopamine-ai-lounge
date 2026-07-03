import { useState, type DragEvent as ReactDragEvent } from "react";
import type { Account, GuestSession } from "../../types";
import { deleteAccount, loadGuestSession } from "../../lib/api";
import { useAccountStore } from "../profile/account.store";
import { useShellStore } from "../shell/shell.store";
import { showToast } from "../../components/Toast/toast.store";
import { purgeScopeData, switchDataScope } from "../../lib/accountScope";

type UseAccountLifecycleArgs = {
  account: Account | null;
  setGuest: (guest: GuestSession | null) => void;
  setShowAccountMenu: (open: boolean) => void;
  setConfirmDeleteAccount: (value: boolean) => void;
  openAvatarImageFile: (file: File | undefined) => void;
};

/** Owns account teardown (delete, sign out) and the profile avatar drag-and-drop.
 *  State shared with ChatPage's modals/panels is passed in; the guest bucket and
 *  data-scope juggling live here. */
export function useAccountLifecycle({
  account,
  setGuest,
  setShowAccountMenu,
  setConfirmDeleteAccount,
  openAvatarImageFile,
}: UseAccountLifecycleArgs) {
  const setPlans = useAccountStore((state) => state.setPlans);
  const signOut = useAccountStore((state) => state.signOut);
  const setView = useShellStore((state) => state.setView);
  const [profileDragActive, setProfileDragActive] = useState(false);

  async function handleDeleteAccount() {
    const scope = account?.id;
    setConfirmDeleteAccount(false);
    const result = await deleteAccount().catch(() => null);

    if (!result?.ok) {
      showToast({ variant: "warning", title: "Deletion failed", description: "The server did not confirm — your account is untouched." });
      return;
    }

    showToast({
      variant: "success",
      title: result.anonymized ? "Account anonymized" : "Account deleted",
      description: result.anonymized ? "Your identity is now “Deleted User” — nothing links back to you." : "Everything about this account is gone.",
    });
    signOut();
    switchDataScope("guest");

    if (scope) {
      // The parked bucket dies with the account — no ghost data on this device.
      purgeScopeData(scope);
    }

    window.setTimeout(() => window.location.reload(), 900);
  }

  async function handleSignOut() {
    setShowAccountMenu(false);
    signOut();

    // Back to the guest bucket — the account's data stays parked under its id.
    if (switchDataScope("guest")) {
      window.location.reload();
      return;
    }

    const result = await loadGuestSession();

    if (result.ok && result.guest) {
      setGuest(result.guest);
      setPlans(result.plans);
    }

    setView("chat");
  }

  function handleProfileDragOver(event: ReactDragEvent<HTMLElement>) {
    if (!account || !Array.from(event.dataTransfer.items).some((item) => item.type.startsWith("image/"))) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setProfileDragActive(true);
  }

  function handleProfileDragLeave(event: ReactDragEvent<HTMLElement>) {
    const nextTarget = event.relatedTarget;

    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setProfileDragActive(false);
    }
  }

  function handleProfileDrop(event: ReactDragEvent<HTMLElement>) {
    if (!account) {
      return;
    }

    event.preventDefault();
    setProfileDragActive(false);
    openAvatarImageFile(Array.from(event.dataTransfer.files).find((file) => file.type.startsWith("image/")));
  }

  return {
    profileDragActive,
    handleDeleteAccount,
    handleSignOut,
    handleProfileDragOver,
    handleProfileDragLeave,
    handleProfileDrop,
  };
}

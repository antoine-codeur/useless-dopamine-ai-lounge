import { useRef, useState } from "react";
import type { Account, GuestSession } from "../../types";
import { useShellStore, type ShellView } from "../shell/shell.store";
import { useDismiss } from "../../lib/useDismiss";
import { showToast } from "../../components/Toast/toast.store";

/** Owns the account popover: open/position state, hover-intent timers, the
 *  outside-click dismiss ref, and the button anchor. Presentational rendering
 *  lives in AccountMenu/ThumbBar; this hook feeds them their handlers. */
export function useAccountMenuControls(account: Account | null, guest: GuestSession | null) {
  const setView = useShellStore((state) => state.setView);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [accountMenuPosition, setAccountMenuPosition] = useState<{ left: number; bottom: number } | null>(null);
  const accountButtonRef = useRef<HTMLButtonElement | null>(null);
  const accountHoverTimer = useRef<number | null>(null);
  const accountMenuRef = useDismiss<HTMLDivElement>(showAccountMenu, () => setShowAccountMenu(false));

  async function copyAccountId() {
    const value = account ? account.handle : guest?.id ?? "guest";
    await navigator.clipboard?.writeText(value);
    showToast({ variant: "success", title: "User ID copied", description: value });
    setShowAccountMenu(false);
  }

  function openAccountView(nextView: ShellView) {
    setView(nextView);
    setShowAccountMenu(false);
  }

  /** Anchored above the account button; fixed so the icon rail can't clip it. */
  function openAccountMenu(anchor: HTMLElement) {
    const rect = anchor.getBoundingClientRect();
    setAccountMenuPosition({ left: Math.max(8, rect.left), bottom: Math.max(8, window.innerHeight - rect.top + 8) });
    setShowAccountMenu(true);
  }

  function clearAccountHoverTimer() {
    if (accountHoverTimer.current) {
      window.clearTimeout(accountHoverTimer.current);
      accountHoverTimer.current = null;
    }
  }

  function handleAccountHoverEnter() {
    if (!window.matchMedia("(hover: hover)").matches) {
      return;
    }

    clearAccountHoverTimer();

    if (!showAccountMenu && accountButtonRef.current) {
      openAccountMenu(accountButtonRef.current);
    }
  }

  function handleAccountHoverLeave() {
    if (!window.matchMedia("(hover: hover)").matches) {
      return;
    }

    clearAccountHoverTimer();
    accountHoverTimer.current = window.setTimeout(() => setShowAccountMenu(false), 220);
  }

  return {
    showAccountMenu,
    setShowAccountMenu,
    accountMenuPosition,
    accountButtonRef,
    accountMenuRef,
    copyAccountId,
    openAccountView,
    openAccountMenu,
    handleAccountHoverEnter,
    handleAccountHoverLeave,
  };
}

import type { RefObject } from "react";
import { BarChart3, ChevronDown, CreditCard, LogIn, LogOut, Settings2, UserRound, Zap } from "lucide-react";
import type { Account, Plan } from "../../types";
import type { ShellView } from "../shell/shell.store";
import { AccountAvatar } from "../account/AccountAvatar";

type AccountMenuProps = {
  account: Account | null;
  currentPlan: Plan | undefined;
  showAccountMenu: boolean;
  setShowAccountMenu: (open: boolean) => void;
  accountMenuPosition: { left: number; bottom: number } | null;
  accountMenuRef: RefObject<HTMLDivElement | null>;
  accountButtonRef: RefObject<HTMLButtonElement | null>;
  handleAccountHoverEnter: () => void;
  handleAccountHoverLeave: () => void;
  openAccountView: (view: ShellView) => void;
  openAccountMenu: (anchor: HTMLElement) => void;
  copyAccountId: () => void;
  handleSignOut: () => void;
  openAuth: (mode: "signup" | "login", message?: string) => void;
};

/** Sidebar account row + its anchored popover menu. Presentational: hover/open
 *  state and every action are owned by ChatPage and passed in. */
export function AccountMenu({
  account,
  currentPlan,
  showAccountMenu,
  setShowAccountMenu,
  accountMenuPosition,
  accountMenuRef,
  accountButtonRef,
  handleAccountHoverEnter,
  handleAccountHoverLeave,
  openAccountView,
  openAccountMenu,
  copyAccountId,
  handleSignOut,
  openAuth,
}: AccountMenuProps) {
  return (
    <div className="account-menu-anchor" onMouseEnter={handleAccountHoverEnter} onMouseLeave={handleAccountHoverLeave} ref={accountMenuRef}>
      {showAccountMenu ? (
        <div
          className="account-popover"
          role="menu"
          style={accountMenuPosition ? { left: accountMenuPosition.left, bottom: accountMenuPosition.bottom } : undefined}
        >
          <div className="account-popover__identity">
            <AccountAvatar account={account} />
            <div>
              <strong>{account?.username ?? "Guest"}</strong>
              <span>{account ? `@${account.handle} · ${currentPlan?.label ?? "Free"}` : "Free guest session"}</span>
            </div>
          </div>
          {account ? (
            <>
              <button onClick={() => openAccountView("profile")} role="menuitem" type="button"><UserRound size={16} /> Profile</button>
              <button onClick={() => openAccountView("settings")} role="menuitem" type="button"><Settings2 size={16} /> Settings</button>
              <button onClick={() => openAccountView("activity")} role="menuitem" type="button"><Zap size={16} /> Activity & usage</button>
              <button onClick={() => openAccountView("stats")} role="menuitem" type="button"><BarChart3 size={16} /> Statistics</button>
              <button onClick={copyAccountId} role="menuitem" type="button"><CreditCard size={16} /> Copy User ID</button>
              <button onClick={handleSignOut} role="menuitem" type="button"><LogOut size={16} /> Log out</button>
            </>
          ) : (
            <>
              <button onClick={() => { openAuth("signup", "Create an account to keep credits, files, and settings."); setShowAccountMenu(false); }} role="menuitem" type="button"><UserRound size={16} /> Create account</button>
              <button onClick={() => { openAuth("login"); setShowAccountMenu(false); }} role="menuitem" type="button"><LogIn size={16} /> Sign in</button>
              <button onClick={() => openAccountView("activity")} role="menuitem" type="button"><Zap size={16} /> Activity & usage</button>
            </>
          )}
        </div>
      ) : null}
      <button
        aria-expanded={showAccountMenu}
        aria-label={account ? "Open account menu" : "Open guest account menu"}
        className="sidebar__account"
        onClick={(event) => {
          if (showAccountMenu) {
            setShowAccountMenu(false);
            return;
          }
          openAccountMenu(event.currentTarget);
        }}
        ref={accountButtonRef}
        type="button"
      >
        <AccountAvatar account={account} />
        <div>
          <strong>{account?.username ?? "Guest"}</strong>
          <span>{account ? currentPlan?.label ?? "Free" : "Free guest"}</span>
        </div>
        <ChevronDown size={16} />
      </button>
    </div>
  );
}

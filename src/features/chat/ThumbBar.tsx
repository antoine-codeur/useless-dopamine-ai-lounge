import type { RefObject } from "react";
import { MessageSquarePlus, MessagesSquare } from "lucide-react";
import type { Account } from "../../types";
import type { ShellView } from "../shell/shell.store";
import { AccountAvatar } from "../account/AccountAvatar";
import { bumpQuest } from "../quests/quest.store";
import { navItems } from "./navItems";

type ThumbBarProps = {
  account: Account | null;
  view: ShellView;
  setView: (view: ShellView) => void;
  newThread: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  showAccountMenu: boolean;
  setShowAccountMenu: (open: boolean) => void;
  openAuth: (mode: "signup" | "login", message?: string) => void;
  openAccountMenu: (anchor: HTMLElement) => void;
  accountButtonRef: RefObject<HTMLButtonElement | null>;
};

/** Phone navigation: a bottom thumb bar that replaces the sidebar on ≤760px. */
export function ThumbBar({
  account,
  view,
  setView,
  newThread,
  mobileNavOpen,
  setMobileNavOpen,
  showAccountMenu,
  setShowAccountMenu,
  openAuth,
  openAccountMenu,
  accountButtonRef,
}: ThumbBarProps) {
  return (
    <nav aria-label="Bottom navigation" className="thumb-bar">
      <button
        aria-label="Conversations"
        className="thumb-bar__item"
        data-active={mobileNavOpen}
        onClick={() => setMobileNavOpen(true)}
        type="button"
      >
        <MessagesSquare size={19} />
        <span>Chats</span>
      </button>
      {navItems
        .filter((item) => !item.railHidden && !item.thumbHidden)
        .map((item) => (
          <button
            className="thumb-bar__item"
            data-active={view === item.view}
            key={item.view}
            onClick={() => {
              setView(item.view);
              bumpQuest("page-visits");
            }}
            type="button"
          >
            <item.icon size={19} />
            <span>{item.label}</span>
          </button>
        ))}
      <button aria-label="New session" className="thumb-bar__item" onClick={newThread} type="button">
        <MessageSquarePlus size={19} />
        <span>New</span>
      </button>
      <button
        aria-label={account ? "Account" : "Sign up or log in"}
        className="thumb-bar__item"
        onClick={() => {
          // Guests go straight to auth — no detour through the menu.
          if (!account) {
            openAuth("signup", "Create an account to keep your credits, unlocks, and quests.");
            return;
          }

          if (showAccountMenu) {
            setShowAccountMenu(false);
            setMobileNavOpen(false);
            return;
          }

          // The popover lives in the sidebar: open the drawer first, then
          // anchor the menu to the (now visible) account row inside it.
          setMobileNavOpen(true);
          requestAnimationFrame(() => {
            if (accountButtonRef.current) {
              openAccountMenu(accountButtonRef.current);
            }
          });
        }}
        type="button"
      >
        <AccountAvatar account={account} />
        <span>{account ? "You" : "Sign in"}</span>
      </button>
    </nav>
  );
}

import type { Account } from "../../types";
import { initials } from "./helpers";

/** Account avatar: shows the stored picture, or initials (guest -> "G"). */
export function AccountAvatar({ account, size = "sm" }: { account: Account | null; size?: "sm" | "lg" }) {
  return (
    <div className={`avatar avatar--${size}`}>
      {account?.avatarDataUrl ? (
        <img alt="" src={account.avatarDataUrl} />
      ) : (
        <span>{account ? initials(account.username) : "G"}</span>
      )}
    </div>
  );
}

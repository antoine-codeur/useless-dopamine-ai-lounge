import type { Account } from "../../types";

/** Two-letter initials fallback for avatars ("Jane Doe" -> "JD"). */
export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

export function todayYear() {
  return new Date().getFullYear();
}

/** The birthday gift is claimable only on the account's birthday, once per year. */
export function canClaimBirthday(account: Account) {
  if (!account.birthDate) {
    return false;
  }

  return (
    account.birthDate.slice(5, 10) === new Date().toISOString().slice(5, 10) &&
    account.birthdayGiftYear !== todayYear()
  );
}

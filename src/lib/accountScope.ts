/**
 * Every persisted store (themes/unlocks, conversations & gallery, personas,
 * quest progress, telemetry) is scoped to an identity: the live keys are the
 * ACTIVE bucket, and each identity keeps its own snapshot under `key::scope`.
 *
 * Switching identity = park the live bucket under the old scope, restore the
 * new scope's bucket (or start clean), then reload so every store re-hydrates.
 */
const SCOPED_KEYS = ["uda:user", "uda:chat", "uda:persona", "uda:quest-progress", "uda:telemetry", "uda:shop", "uda:ledger", "uda:purchases", "uda:season"];
const SCOPE_MARKER = "uda:active-scope";

/**
 * Returns true when a switch happened (callers should reload the app).
 * `carryOver` brings the CURRENT data into the new scope — used at signup
 * (guest progress becomes the account's) and at first boot of a pre-existing
 * logged-in session (data accumulated before scoping existed).
 */
export function switchDataScope(nextScope: string, carryOver = false): boolean {
  const currentScope = localStorage.getItem(SCOPE_MARKER) ?? "guest";

  if (currentScope === nextScope) {
    return false;
  }

  SCOPED_KEYS.forEach((key) => {
    const live = localStorage.getItem(key);

    // Park the live bucket under the identity that owned it.
    if (live !== null) {
      localStorage.setItem(`${key}::${currentScope}`, live);
    } else {
      localStorage.removeItem(`${key}::${currentScope}`);
    }

    const incoming = carryOver ? live : localStorage.getItem(`${key}::${nextScope}`);

    if (incoming !== null) {
      localStorage.setItem(key, incoming);
    } else {
      localStorage.removeItem(key);
    }
  });

  localStorage.setItem(SCOPE_MARKER, nextScope);
  return true;
}

/** True when this identity has never had a bucket on this device. */
export function scopeIsNew(scope: string): boolean {
  return SCOPED_KEYS.every((key) => localStorage.getItem(`${key}::${scope}`) === null);
}

/** Account deletion: its parked bucket is wiped from this device too. */
export function purgeScopeData(scope: string): void {
  SCOPED_KEYS.forEach((key) => localStorage.removeItem(`${key}::${scope}`));
}

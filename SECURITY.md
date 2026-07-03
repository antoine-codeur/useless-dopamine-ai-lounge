# Security

This is a **prototype**: AI responses are simulated and there are no real
payments. Accounts hold an email + password (scrypt-hashed) and simulated
credits. Still, the backend is hardened against the obvious abuse paths.

## Authentication model

- The bearer credential is an **opaque session token** (`randomBytes(32)`),
  issued at signup/login and **rotated on every login**. Only its SHA-256 hash
  is stored server-side (`tokenHash`); the raw token is returned once to the
  client and kept in `localStorage`.
- The **account id is NOT a credential**. It is a plain identifier and may
  appear in owner-scoped responses, but it is never accepted as a bearer and is
  never exposed for other accounts (e.g. the leaderboard ships no ids).
- Passwords are hashed with `scrypt` + a per-user salt; login failures return a
  single uniform error (no user-enumeration via the login response).

## Hardening

- **Per-IP rate limiting** on `/auth/login` and `/accounts`.
- **Request body size cap** (2 MB) — bodies are bounded while reading, so an
  oversized payload can't exhaust memory.
- **Serialized state access** + atomic file writes — the JSON state store runs
  every request through one queue, so read-modify-write cycles can't interleave
  (no lost updates / double-spend) and a crash can't leave a half-written file.
- **Anti-minting** on the simulated economy: plan changes cap the balance at the
  plan allotment, step-refunds are capped, and only *purchased* boosters can be
  refunded (at the average price paid) — so no credit farm via cycling/refunds.
- Reward RNG (wheel, boosters) is server-authoritative and crypto-random.

## Verifying

`make smoke` runs `verify_security.sh` against the running deploy: it checks
account-takeover is closed (token accepted / id rejected), the leaderboard
doesn't leak ids, the daily-wheel and booster guarantees hold, and plan-cycling
does not mint credits. CI (`.github/workflows/ci.yml`) typechecks + builds and
syntax-checks the backend modules on every push.

## Reporting a vulnerability

Open a GitHub issue (or, for something sensitive, contact the repository owner
directly). Please include reproduction steps.

#!/usr/bin/env bash
# Regression checks for the hardened backend: account-takeover, credit/booster
# minting, and the leaderboard id leak must all stay closed. Run against the
# deployed stack (make deploy). Exits non-zero on the first failed check.
set -uo pipefail

B="${UDA_BASE:-http://127.0.0.1:8094}"
fails=0
pass() { printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fails=$((fails + 1)); }
check() { [ "$1" = "$2" ] && pass "$3 ($1)" || fail "$3 (got '$1', want '$2')"; }

jget() { python3 -c "import json,sys; d=json.load(sys.stdin); print(d$1)" 2>/dev/null; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "== hardened-backend regression ($B) =="

email="sec$(date +%s)@example.com"
signup=$(curl -fsS -X POST "$B/api/v1/accounts" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$email\",\"password\":\"Abcd1234!\"}")
token=$(printf '%s' "$signup" | jget "['token']")
id=$(printf '%s' "$signup" | jget "['account']['id']")
[ -n "$token" ] && pass "signup returns a session token" || fail "signup returns a session token"

# 1. Account takeover: the account id must NOT work as a bearer; the token must.
check "$(code "$B/api/v1/session" -H "Authorization: Bearer $token")" "200" "session accepts the token"
check "$(code "$B/api/v1/session" -H "Authorization: Bearer $id")"    "401" "session REJECTS the account id (takeover closed)"

# 2. Leaderboard must not leak account ids.
if curl -fsS "$B/api/v1/leaderboard" | grep -q '"id"'; then
  fail "leaderboard does not leak id"
else
  pass "leaderboard does not leak id"
fi

# 3. Fortune wheel: first spin is the guaranteed +50; second same-day is blocked.
seg=$(curl -fsS -X POST "$B/api/v1/wheel/spin" -H "Authorization: Bearer $token" | jget "['segmentId']")
check "$seg" "credits-50" "first wheel spin is guaranteed +50"
check "$(code -X POST "$B/api/v1/wheel/spin" -H "Authorization: Bearer $token")" "409" "second same-day spin is blocked"

# 4. First booster open is the guaranteed 100; the free/daily ones can't be refunded.
reward=$(curl -fsS -X POST "$B/api/v1/boosters/open" -H "Authorization: Bearer $token" | jget "['rewardCredits']")
check "$reward" "100" "first booster open is guaranteed 100"
refund=$(curl -s -X POST "$B/api/v1/boosters/refund" -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' -d '{"count":1}' | jget "['error']")
check "$refund" "boosters_opened" "granted boosters can't be refunded for credits"

# 5. Plan-cycling must not mint credits (balance capped at the plan allotment).
curl -s -X PATCH "$B/api/v1/account" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d '{"plan":"pro"}' >/dev/null
curl -s -X PATCH "$B/api/v1/account" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d '{"plan":"free"}' >/dev/null
bal=$(curl -fsS "$B/api/v1/session" -H "Authorization: Bearer $token" | jget "['account']['creditsRemaining']")
[ "$bal" -le 100 ] && pass "plan cycling did not mint credits (balance=$bal <= 100)" || fail "plan cycling minted credits (balance=$bal)"

echo
if [ "$fails" -eq 0 ]; then
  printf '\033[32mall security checks passed\033[0m\n'
else
  printf '\033[31m%d check(s) failed\033[0m\n' "$fails"; exit 1
fi

#!/usr/bin/env bash
set -euo pipefail

# Plan upgrade happy path. Bearer = the session token from signup.
suffix="$(date +%s)"
handle="upgradeqa${suffix}"
payload="{\"username\":\"Upgrade QA\",\"handle\":\"$handle\",\"email\":\"upg${suffix}@example.com\",\"password\":\"correct-horse-${suffix}\"}"
created=$(printf '%s' "$payload" | curl -fsS -X POST http://127.0.0.1:8094/api/v1/accounts -H 'Content-Type: application/json' --data-binary @-)
echo "$created"
token=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['token'])" "$created")
printf '%s' '{"plan":"pro"}' | curl -fsS -X PATCH http://127.0.0.1:8094/api/v1/account -H 'Content-Type: application/json' -H "Authorization: Bearer $token" --data-binary @-
printf '\n'
curl -fsS http://127.0.0.1:8094/healthz

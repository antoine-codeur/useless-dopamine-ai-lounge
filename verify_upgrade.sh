#!/usr/bin/env bash
set -euo pipefail

handle="upgradeqa$(date +%s)"
payload="{\"username\":\"Upgrade QA\",\"handle\":\"$handle\"}"
created=$(printf '%s' "$payload" | curl -fsS -X POST http://127.0.0.1:8094/api/v1/accounts -H 'Content-Type: application/json' --data-binary @-)
echo "$created"
id=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['account']['id'])" "$created")
printf '%s' '{"plan":"pro"}' | curl -fsS -X PATCH http://127.0.0.1:8094/api/v1/account -H 'Content-Type: application/json' -H "Authorization: Bearer $id" --data-binary @-
printf '\n'
curl -fsS http://127.0.0.1:8094/healthz

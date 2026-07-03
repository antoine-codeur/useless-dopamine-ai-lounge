#!/usr/bin/env bash
set -euo pipefail

suffix="$(date +%s)"
email="qa${suffix}@example.com"
password="correct-horse-${suffix}"
new_password="better-horse-${suffix}"
payload="{\"username\":\"QA User\",\"handle\":\"qa_${suffix}\",\"email\":\"$email\",\"password\":\"$password\"}"

created=$(printf '%s' "$payload" | curl -fsS -X POST http://127.0.0.1:8094/api/v1/accounts -H 'Content-Type: application/json' --data-binary @-)
echo "$created"
id=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['account']['id'])" "$created")

printf '%s' "{\"email\":\"$email\",\"password\":\"$password\"}" \
  | curl -fsS -X POST http://127.0.0.1:8094/api/v1/auth/login -H 'Content-Type: application/json' --data-binary @-
printf '\n'

printf '%s' "{\"currentPassword\":\"$password\",\"newPassword\":\"$new_password\"}" \
  | curl -fsS -X PATCH http://127.0.0.1:8094/api/v1/account -H 'Content-Type: application/json' -H "Authorization: Bearer $id" --data-binary @-
printf '\n'

curl -fsS -X POST http://127.0.0.1:8094/api/v1/boosters/open -H "Authorization: Bearer $id"
printf '\n'

printf '%s' '{"questId":"daily-check-in"}' \
  | curl -fsS -X POST http://127.0.0.1:8094/api/v1/quests/claim -H 'Content-Type: application/json' -H "Authorization: Bearer $id" --data-binary @-
printf '\n'

curl -fsS http://127.0.0.1:8094/healthz

#!/bin/bash
set -euo pipefail
cd /opt/kidskalender
docker compose up -d --build api
sleep 3
docker compose exec -T api ls -la apps/api/dist/db/migrations
docker compose exec -T api ls -la apps/api/dist/db/migrations/meta
echo '---MIGRATE---'
docker compose exec -T api node apps/api/dist/db/migrate.js
echo '---SEED---'
docker compose exec -T api node apps/api/dist/db/seed.js
echo '---USERS---'
docker compose exec -T api node apps/api/dist/scripts/create-test-users.js
echo '---CURL---'
curl -sS https://kalender.breaz-it.be/api/health || true
echo
curl -sS -o /dev/null -w "web:%{http_code}\n" https://kalender.breaz-it.be/
echo POST_SETUP_OK
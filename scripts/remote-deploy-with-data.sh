#!/bin/bash
set -euo pipefail
cd /opt/kidskalender

echo '---EXTRACT---'
tar -xf /tmp/deploy-upload.tar -C /opt/kidskalender
rm -f /tmp/deploy-upload.tar

echo '---BUILD---'
docker compose up -d --build

echo '---MIGRATE---'
docker compose exec -T api node apps/api/dist/db/migrate.js

echo '---RESTORE_DB---'
# Import local dump into live postgres (overwrites tables)
docker compose exec -T postgres psql -U kidscalendar -d kidscalendar < /tmp/local-to-live.sql
rm -f /tmp/local-to-live.sql

echo '---COUNTS---'
docker compose exec -T postgres psql -U kidscalendar -d kidscalendar -c "SELECT (SELECT count(*) FROM calendar_entries) AS entries, (SELECT count(*) FROM users) AS users;"

echo '---HEALTH---'
curl -sS https://kalender.breaz-it.be/api/health || true
echo
echo DATA_DEPLOY_OK

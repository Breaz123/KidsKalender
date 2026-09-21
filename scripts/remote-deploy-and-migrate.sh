#!/bin/bash
set -euo pipefail
cd /opt/kidskalender
tar -xf /tmp/deploy-upload.tar -C /opt/kidskalender
rm -f /tmp/deploy-upload.tar
echo '---BUILD---'
docker compose up -d --build
echo '---MIGRATE---'
docker compose exec -T api node apps/api/dist/db/migrate.js
echo '---HEALTH---'
curl -sS https://kalender.breaz-it.be/api/health || true
echo
echo DEPLOY_OK

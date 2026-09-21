#!/bin/bash
set -euo pipefail
cd /opt/kidskalender
# Keep existing production .env
tar -xf /tmp/deploy-upload.tar -C /opt/kidskalender
rm -f /tmp/deploy-upload.tar
echo '---BUILD---'
docker compose up -d --build
echo '---USERS---'
docker compose exec -T api node apps/api/dist/scripts/create-test-users.js
echo '---HEALTH---'
curl -sS https://kalender.breaz-it.be/api/health || true
echo
echo UPDATE_USERS_OK

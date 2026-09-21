#!/bin/bash
set -euo pipefail
cd /opt/kidskalender
tar -xf /tmp/deploy-upload.tar -C /opt/kidskalender
rm -f /tmp/deploy-upload.tar
docker compose up -d --build api
sleep 3
curl -sS https://kalender.breaz-it.be/api/health || true
echo
echo SESSION_DEPLOY_OK

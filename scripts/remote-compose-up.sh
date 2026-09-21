#!/bin/bash
set -euo pipefail
cd /opt/kidskalender
docker compose up -d --build
echo COMPOSE_UP_OK
docker compose ps
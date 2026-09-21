#!/bin/bash
set -euo pipefail
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
chmod +x /tmp/get-docker.sh
bash /tmp/get-docker.sh
docker --version
docker compose version
echo INSTALL_OK
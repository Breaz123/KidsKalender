#!/bin/bash
set -euo pipefail
mkdir -p /opt/kidskalender
tar -xf /tmp/deploy-upload.tar -C /opt/kidskalender
cp /tmp/env.production.deploy /opt/kidskalender/.env
rm -f /tmp/deploy-upload.tar /tmp/env.production.deploy
ls /opt/kidskalender
echo DEPLOY_FILES_OK
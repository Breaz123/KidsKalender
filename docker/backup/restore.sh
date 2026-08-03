#!/bin/sh
set -e

if [ -z "$1" ]; then
  echo "Gebruik: restore.sh bestand.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
BACKUP_DIR="${BACKUP_DIR:-/backups}"

if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ] && [ ! -f "$BACKUP_FILE" ]; then
  echo "Bestand niet gevonden: $BACKUP_FILE"
  exit 1
fi

FULL_PATH="$BACKUP_FILE"
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
  FULL_PATH="$BACKUP_DIR/$BACKUP_FILE"
fi

echo "WAARSCHUWING: Dit overschrijft de huidige database!"
echo "Herstellen van: $FULL_PATH"

gunzip -c "$FULL_PATH" | PGPASSWORD="$POSTGRES_PASSWORD" psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "Herstel voltooid."

#!/bin/sh
set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="kidscalendar_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Back-up starten: $FILENAME"
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$BACKUP_DIR/$FILENAME"
echo "Back-up opgeslagen: $BACKUP_DIR/$FILENAME"

echo "Oude back-ups opruimen (>${RETENTION_DAYS} dagen)..."
find "$BACKUP_DIR" -name "kidscalendar_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

echo "Back-up voltooid."

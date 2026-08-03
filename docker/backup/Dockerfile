FROM postgres:16-alpine AS base

FROM base AS backup
RUN apk add --no-cache bash
COPY docker/backup/backup.sh /backup.sh
COPY docker/backup/restore.sh /restore.sh
RUN chmod +x /backup.sh /restore.sh
CMD ["sh", "-c", "while true; do /backup.sh; sleep 86400; done"]

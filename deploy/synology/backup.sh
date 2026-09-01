#!/bin/sh
set -eu
umask 077
root=/volume1/docker/legal-document-builder
stamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$root/backups/$stamp"
mkdir -p "$target"
docker compose --project-directory "$root" -f "$root/compose.yaml" exec -T postgres sh -c 'exec pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$target/database.dump"
tar -C "$root/data" -czf "$target/publishing.tar.gz" publishing
sha256sum "$target/database.dump" "$target/publishing.tar.gz" > "$target/SHA256SUMS"
find "$root/backups" -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf -- {} +
printf '%s\n' "$target"

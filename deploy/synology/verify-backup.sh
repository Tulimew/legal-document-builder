#!/bin/sh
set -eu
umask 077
if [ "$#" -ne 1 ]; then echo "Usage: $0 /volume1/docker/legal-document-builder/backups/<timestamp>" >&2; exit 2; fi
bundle=$1
root=/volume1/docker/legal-document-builder
case "$bundle" in "$root/backups/"*) ;; *) echo "Backup path is outside the approved root" >&2; exit 2;; esac
test -f "$bundle/database.dump" && test -f "$bundle/publishing.tar.gz" && test -f "$bundle/SHA256SUMS"
(cd "$bundle" && sha256sum -c SHA256SUMS)
verify_db=legal_builder_restore_verify
compose="docker compose --project-directory $root -f $root/compose.yaml"
$compose exec -T postgres sh -c 'dropdb --if-exists -U "$POSTGRES_USER" legal_builder_restore_verify && createdb -U "$POSTGRES_USER" legal_builder_restore_verify'
$compose exec -T postgres sh -c 'pg_restore --exit-on-error --no-owner -U "$POSTGRES_USER" -d legal_builder_restore_verify' < "$bundle/database.dump"
$compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d legal_builder_restore_verify -c "SELECT count(*) FROM public.legal_builder_schema_migration"'
temporary=$(mktemp -d "$root/data/restore-verify.XXXXXX")
trap '$compose exec -T postgres sh -c '\''dropdb --if-exists -U "$POSTGRES_USER" legal_builder_restore_verify'\'' >/dev/null 2>&1 || true; rm -rf -- "$temporary"' EXIT
tar -C "$temporary" -xzf "$bundle/publishing.tar.gz"
test -d "$temporary/publishing"
echo "RESTORE_VERIFIED"

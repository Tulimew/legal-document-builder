#!/bin/sh
set -eu
umask 077

root=/volume1/docker/legal-document-builder
config_env="$root/config/offsite-backup.env"

fail() { printf 'OFFSITE_VERIFY_ERROR: %s\n' "$1" >&2; exit 1; }
test "$#" -eq 1 || fail "usage: $0 <backup timestamp>"
stamp=$1
case "$stamp" in *[!0-9TZ]*|'') fail "invalid backup timestamp" ;; esac
test -f "$config_env" || fail "missing $config_env"
# shellcheck disable=SC1090
. "$config_env"
: "${LEGAL_BUILDER_RCLONE_CONFIG:?LEGAL_BUILDER_RCLONE_CONFIG is required}"
: "${LEGAL_BUILDER_OFFSITE_REMOTE:?LEGAL_BUILDER_OFFSITE_REMOTE is required}"
command -v rclone >/dev/null 2>&1 || fail "rclone is not installed"

remote_name=${LEGAL_BUILDER_OFFSITE_REMOTE%%:*}
remote_type=$(rclone config show "$remote_name" --config "$LEGAL_BUILDER_RCLONE_CONFIG" 2>/dev/null | sed -n 's/^type = //p')
test "$remote_type" = crypt || fail "offsite remote must be an rclone crypt remote"

temporary=$(mktemp -d "$root/data/offsite-verify.XXXXXX")
trap 'rm -rf -- "$temporary"' EXIT
source_path=${LEGAL_BUILDER_OFFSITE_REMOTE%/}/$stamp
rclone copy "$source_path" "$temporary" \
  --config "$LEGAL_BUILDER_RCLONE_CONFIG" \
  --immutable \
  --log-level NOTICE

test -f "$temporary/database.dump"
test -f "$temporary/publishing.tar.gz"
test -f "$temporary/SHA256SUMS"
(cd "$temporary" && sha256sum -c SHA256SUMS)
printf 'OFFSITE_BACKUP_VERIFIED remote=%s\n' "$source_path"


#!/bin/sh
set -eu
umask 077

root=/volume1/docker/legal-document-builder
config_env="$root/config/offsite-backup.env"

fail() { printf 'OFFSITE_BACKUP_ERROR: %s\n' "$1" >&2; exit 1; }

test -f "$config_env" || fail "missing $config_env"
mode=$(stat -c '%a' "$config_env" 2>/dev/null || stat -f '%Lp' "$config_env")
case "$mode" in 600|400) ;; *) fail "offsite-backup.env must have mode 0600 or 0400" ;; esac

# shellcheck disable=SC1090
. "$config_env"
: "${LEGAL_BUILDER_RCLONE_CONFIG:?LEGAL_BUILDER_RCLONE_CONFIG is required}"
: "${LEGAL_BUILDER_OFFSITE_REMOTE:?LEGAL_BUILDER_OFFSITE_REMOTE is required}"

command -v rclone >/dev/null 2>&1 || fail "rclone is not installed"
test -f "$LEGAL_BUILDER_RCLONE_CONFIG" || fail "rclone config does not exist"
case "$LEGAL_BUILDER_RCLONE_CONFIG" in "$root/config/"*) ;; *) fail "rclone config must be below $root/config" ;; esac
config_mode=$(stat -c '%a' "$LEGAL_BUILDER_RCLONE_CONFIG" 2>/dev/null || stat -f '%Lp' "$LEGAL_BUILDER_RCLONE_CONFIG")
case "$config_mode" in 600|400) ;; *) fail "rclone config must have mode 0600 or 0400" ;; esac
case "$LEGAL_BUILDER_OFFSITE_REMOTE" in *:) fail "offsite remote must include a dedicated destination path" ;; *:*) ;; *) fail "invalid rclone remote" ;; esac

remote_name=${LEGAL_BUILDER_OFFSITE_REMOTE%%:*}
remote_type=$(rclone config show "$remote_name" --config "$LEGAL_BUILDER_RCLONE_CONFIG" 2>/dev/null | sed -n 's/^type = //p')
test "$remote_type" = crypt || fail "offsite remote must be an rclone crypt remote"

bundle=$($root/backup.sh)
case "$bundle" in "$root/backups/"*) ;; *) fail "local backup returned an unsafe path" ;; esac
(cd "$bundle" && sha256sum -c SHA256SUMS)

stamp=${bundle##*/}
destination=${LEGAL_BUILDER_OFFSITE_REMOTE%/}/$stamp
rclone copy "$bundle" "$destination" \
  --config "$LEGAL_BUILDER_RCLONE_CONFIG" \
  --immutable \
  --check-first \
  --log-level NOTICE

rclone check "$bundle" "$destination" \
  --config "$LEGAL_BUILDER_RCLONE_CONFIG" \
  --download \
  --one-way \
  --log-level NOTICE

manifest_hash=$(sha256sum "$bundle/SHA256SUMS" | awk '{print $1}')
receipt="$bundle/OFFSITE-RECEIPT"
{
  printf 'uploaded_at_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'remote_path=%s\n' "$destination"
  printf 'sha256_manifest=%s\n' "$manifest_hash"
  printf 'encryption=rclone-crypt\n'
} > "$receipt"

printf 'OFFSITE_BACKUP_OK bundle=%s remote=%s\n' "$bundle" "$destination"


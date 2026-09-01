#!/bin/sh
set -eu
umask 077
root=/volume1/docker/legal-document-builder
test -f "$root/config/runtime.env" && test -f "$root/config/postgres.env"
test "$(stat -c %a "$root/config/runtime.env")" -le 640
test "$(stat -c %a "$root/config/postgres.env")" -le 640
export LEGAL_BUILDER_IMAGE=${LEGAL_BUILDER_IMAGE:?Set immutable image tag}
docker compose --project-directory "$root" -f "$root/compose.yaml" config --quiet
"$root/backup.sh"
docker compose --project-directory "$root" -f "$root/compose.yaml" pull
docker compose --project-directory "$root" -f "$root/compose.yaml" up migrate
docker compose --project-directory "$root" -f "$root/compose.yaml" up -d postgres web worker
docker compose --project-directory "$root" -f "$root/compose.yaml" ps

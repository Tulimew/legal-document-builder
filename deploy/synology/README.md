# Synology deployment

Target: Synology Container Manager on `192.168.1.178`, with all persistent state under `/volume1/docker/legal-document-builder`. PostgreSQL stays on the private Compose network. Only `127.0.0.1:13108` is published for the Synology reverse proxy; do not expose this port or PostgreSQL directly to LAN/WAN.

## One-time preparation

1. Create `config`, `data/postgres`, `data/publishing`, `backups` and `releases` below the target directory.
2. Copy `compose.yaml`, `backup.sh`, `verify-backup.sh` and `deploy.sh`; mark shell scripts executable.
3. Create `config/runtime.env` and `config/postgres.env` from the examples, use unique random secrets and mode `0600`. These files are never copied into an image or Git.
4. Configure Synology Reverse Proxy: HTTPS host chosen by the owner → `http://127.0.0.1:13108`; enable HSTS after HTTPS verification. Set `HTTP_ALLOWED_ORIGINS` to that exact HTTPS origin.
5. Build the image on the workstation/CI, not in `/root` on the NAS. Tag it immutably with the Git SHA and transfer/push it to a registry reachable by the NAS.

## Release

Run `LEGAL_BUILDER_IMAGE=<registry>/legal-document-builder:<full-git-sha> ./deploy.sh`. The script validates config permissions and Compose, takes a backup, runs forward-only migrations and starts web/worker only after migration succeeds.

Provision each named user with `LEGAL_BUILDER_INITIAL_PASSWORD` supplied only to the one-shot command environment. Then assign project membership/roles through the governed database administration procedure. Shared `admin` accounts are forbidden.

## Recovery

`backup.sh` writes a PostgreSQL custom-format dump, publishing archive and SHA-256 manifest. `verify-backup.sh <absolute-bundle>` restores only into the fixed disposable database `legal_builder_restore_verify`, validates migrations and extracts publishing data into a temporary directory; it never overwrites production. Default retention is 30 days. Final RPO/RTO and Hyper Backup replication are certified in M13.

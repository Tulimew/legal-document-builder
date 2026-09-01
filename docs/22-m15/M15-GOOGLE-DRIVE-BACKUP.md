# M15 — Encrypted Google Drive offsite backup

## Scope

M15 adds a second, encrypted copy of each verified Synology backup on Google Drive. PostgreSQL and publishing files remain the authoritative production data on the NAS. The local backup remains the first recovery source.

## Data flow

1. `backup.sh` creates a PostgreSQL custom-format dump and publishing archive.
2. `SHA256SUMS` is verified locally before upload.
3. `backup-offsite-google-drive.sh` requires an externally configured `rclone crypt` remote.
4. A timestamped directory is copied with immutable semantics and checked byte-for-byte through the crypt remote.
5. `verify-offsite-backup.sh` can download one timestamp to a temporary directory and verify the original SHA-256 manifest.

## Security and operational boundaries

- OAuth credentials, Drive tokens and crypt passwords live only in `/volume1/docker/legal-document-builder/config/rclone.conf` with mode `0600`.
- `offsite-backup.env` also has mode `0600` and contains only paths/remote selection.
- Repository scripts never print the rclone configuration.
- Remote deletion and retention are intentionally absent. Drive retention needs a separately approved policy.
- The scripts do not restore production automatically.
- The first NAS rollout requires installation/configuration of `rclone`, Google OAuth authorization and a real upload/download verification.

## Acceptance checklist

- [x] Local SHA-256 verification precedes upload.
- [x] Only a crypt remote is accepted.
- [x] Existing remote objects cannot be overwritten silently.
- [x] Upload performs a remote content check.
- [x] Independent download-and-check command is provided.
- [x] No token, password or private key is stored in Git.
- [ ] Real NAS Google Drive authorization completed.
- [ ] Real encrypted upload/download and restore drill completed.

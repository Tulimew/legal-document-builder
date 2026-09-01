# M12 Completion Report

> Verdict: **READY TO MERGE**

## Acceptance checklist

- [x] Production identity rejects development headers and uses named local accounts.
- [x] Passwords use salted scrypt; credential data is separate from stable user identity.
- [x] Secure signed sessions expire and reject tampering.
- [x] Production preflight validates identity, origin, PostgreSQL migration and storage readiness.
- [x] Synology Compose keeps PostgreSQL private and exposes web only on loopback for DSM reverse proxy.
- [x] Publishing storage and PostgreSQL use separate `/volume1/docker` bind mounts.
- [x] Secrets are external files excluded from Git and image.
- [x] Deployment takes backup before forward-only migration.
- [x] Backup includes database, publishing artifacts and SHA-256 manifest.
- [x] Restore verification is isolated from production database/storage.
- [x] Full test/lint/build/diff gates: 210/210 tests PASS on fresh PostgreSQL 18; production preflight, lint and standalone build PASS.

## Migration

`0026_m12_local_identity.sql` creates only `local_account_credential`; it does not rewrite `user_account`, stable LegalNode IDs, snapshots, provenance, audit or historical records.

## Remaining M13 evidence

DSM reverse proxy/TLS configuration, official hostname, image transfer/registry, real NAS deployment, named-user UAT, Hyper Backup schedule and timed recovery drill require access to the target NAS and are not claimed by M12 repository tests.

Docker CLI is not installed on the Windows development host, so the image was not locally built and Compose was not executed here. Static deployment boundary tests pass; the actual Container Manager build/start/health and shell-script execution remain explicit M13 target evidence.

## Commit map

- `ce12344` — named local production identity, credential migration and PostgreSQL integration evidence.
- `d1cdb92` — Synology image/Compose, production preflight, storage, backup and isolated restore tooling.

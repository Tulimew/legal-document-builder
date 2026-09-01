# M11 Deployment and Recovery Runbook

## Boundary

This runbook covers a provider-neutral release candidate. Production IAM, TLS/WAF, secrets and NAS/object storage must be selected and accepted in M12 before go-live.

## Release preparation

1. Use a clean, immutable Git commit and Node.js 24.
2. Run `npm.cmd ci`, `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build` and dependency audit in `app/web`.
3. Run `npm.cmd run release:manifest` and verify migration head `0025_m10_security_audit_integrity.sql`.
4. Run `npm.cmd run release:package -- <absolute-output-directory-outside-repository>`.
5. Treat a package as invalid if its source commit differs between web, worker or inventory.

## Startup order

1. Restore/verify secrets through the selected external mechanism; never place `.env` in a release package.
2. Verify PostgreSQL backup and maintenance window.
3. Apply forward-only migrations with `npm.cmd run db:migrate` using a dedicated migrator identity.
4. Run `npm.cmd run deployment:preflight`; a non-zero exit blocks startup.
5. Start the web process, verify liveness/readiness, then start the independent publishing worker.

## Rollback boundary

- Application rollback may redeploy the preceding package only when it supports the current forward schema.
- Database migrations are not automatically reversed. A schema/data problem requires a reviewed forward repair or recovery from the verified pre-migration backup.
- Never edit `legal_builder_schema_migration`, immutable snapshots, audit/provenance or security evidence to force readiness.

## Backup and restore

- Use the development recovery commands only for explicitly named `_dev` databases.
- Production backup, retention, encryption, RPO/RTO and restore commands remain an M12/M13 infrastructure decision.
- After restore, verify migration checksums, snapshot/artifact checksums, release-package verification and project-scoped authorization before traffic is enabled.

## Incident triage

1. Record correlation ID and timestamp; do not copy request bodies or secrets into tickets.
2. Check liveness, readiness, publishing queue and redacted security diagnostics.
3. Stop the worker before intervening in a publishing incident; do not mutate immutable evidence.
4. Escalate identity, storage, database integrity or migration mismatch as a release blocker.

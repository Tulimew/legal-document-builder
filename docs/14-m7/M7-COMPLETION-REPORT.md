# M7 Completion Report

## 1. Acceptance checklist

- [x] Forward-only migrations `0020`–`0023`; no historical snapshot, UUID, or checksum rewrite.
- [x] Immutable, versioned publishing templates and exact DraftVersion/RuleSet/template/renderer lineage.
- [x] Put-once filesystem `StoragePort`, atomic write, traversal/symlink protection, round-trip checksum verification, and orphan ledger.
- [x] Durable PostgreSQL queue with idempotency fingerprint, `SKIP LOCKED`, leases, bounded retry, recovery, and terminal-state guards.
- [x] Server-side canonical draft, review synthesis, and comparison DOCX; server-side PDF rendition.
- [x] Typed, optimistic-concurrency `ReleasePackage`, canonical manifest, authority basis, audit, seal, and post-seal verification.
- [x] Authorized artifact download and verification without exposing storage keys.
- [x] Browser flow: request DOCX/PDF, observe success, download, seal package, and verify manifest plus binaries.
- [x] Microsoft Word opened the generated DOCX; Word export and direct PDF both rendered with Vietnamese Unicode and structured table content.
- [x] Fresh PostgreSQL migration/seed, 153/153 tests, lint, production build, and diff-check pass.

## 2. Completed capabilities

M7 provides governed artifacts from immutable DraftVersion snapshots. Jobs, artifacts, verification history, package metadata, canonical manifests, lineage, authority, and audit evidence are persistent in PostgreSQL. Binary content remains outside PostgreSQL behind an opaque storage port. Development templates are explicitly classified `DEVELOPMENT_ONLY_NOT_FOR_PRODUCTION_RELEASE` in sealed manifests.

## 3. Test and E2E evidence

- 153 tests pass serially against a newly created PostgreSQL 18 development database migrated through `0023`.
- Integration coverage includes template immutability, storage safety, durable claims and recovery, idempotency conflicts, DOCX/PDF generation, JSONB/checksum lineage, package revision rollback/seal/verification, authorization, corrupt binary detection, and append-only verification evidence.
- Browser E2E created job IDs `469c129a-88f9-4baa-8480-a1f2c6bde314` and `f8dc7c1d-b41e-484b-aad7-798a89bfb29a`, downloaded an artifact, sealed package `ab45c1a0-0de2-4b7b-8144-ec80c1360ef1`, and reported the package VERIFIED.
- Microsoft Word opened the DOCX and exported it to PDF. Poppler rendered both Word's rendition and the direct worker PDF for visual inspection; Vietnamese accents, hierarchy, table border/content, and pagination were intact.

## 4. Migrations

- `0020_m7_publishing_foundation.sql`
- `0021_m7_draft_docx_template.sql`
- `0022_m7_pdf_and_artifact_immutability.sql`
- `0023_m7_publishing_integrity.sql`

`0023` deterministically derives artifact source metadata from referenced immutable DraftVersion rows and does not edit the source snapshot or identity.

## 5. Remaining technical debt

- The development filesystem adapter is not a production NAS/S3 decision and has no production backup/restore certification.
- Templates are controlled development configurations, not authority-approved legal templates.
- Worker execution is invoked in-process by the current modular-monolith API; independent service scheduling/operations remains deployment work.
- Orphan reconciliation is persisted and auditable, but automated cleanup policy/operations is not part of M7.
- Official issuance, digital signature, timestamp authority, retention policy, and production identity remain open.

## 6. Prototype capability outside scope

Production IAM/SSO, NAS or object-storage adapter, public distribution, official publishing workflow, digital signatures, AI integration, and deployment hardening remain outside M7. No development result is represented as production readiness.

## 7. Git commit map

- `b64d375` — persisted publishing templates and artifact contracts
- `a2a4e4b` — immutable storage port and filesystem adapter
- `da3e0e4` — durable DOCX publishing jobs
- `1f3f87b` — PDF rendition and governed release packages
- Phase 5 acceptance commit — API/UI verification, integrity migration, E2E evidence, and completion documents

## 8. Merge readiness

**READY TO MERGE.** M7's Definition of Done is satisfied for a development baseline. This verdict does not certify production identity, official issuance, digital signature, NAS deployment, backup/restore, or legal-template approval.

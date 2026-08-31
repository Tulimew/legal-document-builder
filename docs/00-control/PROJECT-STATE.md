# Project State

- **Current milestone:** M7 — Governed Publishing & Release Artifacts
- **Current phase:** Phase 5 complete; `READY TO MERGE`
- **Main baseline:** `17b66a1514532576fd4f2b9648281bcea0d1ea4a`
- **Branch:** `codex/m7-governed-publishing`
- **Migrations:** `0001`–`0023`; templates, durable jobs, generated artifacts, verification history, orphan evidence, and release packages are persistent
- **Test count:** 153/153 PASS on a newly migrated and seeded PostgreSQL 18 development database
- **Completed capabilities:** M6 baseline plus versioned templates, immutable filesystem storage, durable DOCX/PDF publishing, authorized download/verification, and sealed canonical release packages
- **Remaining capabilities:** production IAM, approved legal templates, NAS/object-storage deployment, backup/restore, official issuance/digital signature, and AI integration (outside M7)
- **Open blockers:** none for M7 merge; production deployment is explicitly not certified
- **Last successful build:** M7 Phase 5 — tests, lint, production build, diff-check, browser E2E, Word DOCX open/export, and PDF visual QA PASS

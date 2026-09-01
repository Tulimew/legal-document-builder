# Project State

- **Current milestone:** M10 — Application Security & Governance Hardening
- **Current phase:** Phase 5 complete; `READY TO MERGE` pending owner review
- **Main baseline:** M9 merge `4ad66a2f4e3344cf9838900132a8f5277c24bd6a`
- **Branch:** `codex/m10-security-governance-hardening`
- **Migrations:** `0001`–`0025`; `0025` adds append-only, project-scoped security rejection evidence without historical backfill
- **Test count:** 193/193 PASS on fresh PostgreSQL 18 database `legal_document_builder_m10_acceptance_20260901_dev`
- **Completed capabilities:** M9 baseline plus HTTP mutation guard/security headers, bounded correlation IDs, machine-testable authorization matrix, append-only security rejection evidence and permissioned redacted security diagnostics
- **Remaining capabilities:** production IAM/TLS/WAF/secrets/NAS provider choices, approved templates, official issuance/signature and AI remain later decision scope
- **Open blockers:** none for M10 merge review; manual browser E2E remains owner-deferred and was not executed
- **Last successful build:** M10 Phase 5 — fresh migrations/seed, 193 tests, lint, production build, dependency audit and diff-check PASS

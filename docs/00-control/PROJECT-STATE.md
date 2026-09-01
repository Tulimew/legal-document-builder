# Project State

- **Current milestone:** M11 — Release Candidate & Deployment Readiness
- **Current phase:** Scope defined; Phase 1 production-mode configuration starting
- **Main baseline:** M10 merge `0829a642ce6031cae412722139fe4dfb7fbf646e`
- **Branch:** `codex/m11-release-candidate-readiness`
- **Migrations:** `0001`–`0025`; `0025` adds append-only, project-scoped security rejection evidence without historical backfill
- **Test count:** 193/193 PASS on fresh PostgreSQL 18 database `legal_document_builder_m10_acceptance_20260901_dev`
- **Completed capabilities:** M9 baseline plus HTTP mutation guard/security headers, bounded correlation IDs, machine-testable authorization matrix, append-only security rejection evidence and permissioned redacted security diagnostics
- **Remaining capabilities:** production IAM/TLS/WAF/secrets/NAS provider choices, approved templates, official issuance/signature and AI remain later decision scope
- **Open blockers:** none for provider-neutral M11 work; production IAM/storage/TLS provider selection remains a mandatory stop point for M12
- **Last successful build:** M10 Phase 5 — fresh migrations/seed, 193 tests, lint, production build, dependency audit and diff-check PASS

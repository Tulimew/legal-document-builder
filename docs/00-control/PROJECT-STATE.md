# Project State

- **Current milestone:** M10 — Application Security & Governance Hardening
- **Current phase:** Scope defined; Phase 1 HTTP security boundary starting
- **Main baseline:** M9 merge `4ad66a2f4e3344cf9838900132a8f5277c24bd6a`
- **Branch:** `codex/m10-security-governance-hardening`
- **Migrations:** `0001`–`0024`; M8 adds project search/activity/membership permissions, with product state remaining PostgreSQL-persistent
- **Test count:** 180/180 PASS on fresh PostgreSQL 18 database `legal_document_builder_m9_final_20260901_dev`
- **Completed capabilities:** M8 baseline plus runtime readiness, independent publishing worker, `_dev` recovery verification, and permissioned project operational diagnostics without sensitive paths/content
- **Remaining capabilities:** M10 HTTP/authorization/audit hardening; production IAM/NAS/RPO/RTO, approved templates, official issuance/signature and AI remain later decision scope
- **Open blockers:** none for M10 Phase 1; production-provider choices remain explicit stop points
- **Last successful build:** M9 Phase 5 — fresh migrations/seed, 180 tests, lint, production build and diff-check PASS

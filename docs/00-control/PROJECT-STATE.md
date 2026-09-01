# Project State

- **Current milestone:** M9 — Deployment-neutral Pilot Operations Foundation
- **Current phase:** Phase 5 complete; `READY TO MERGE`
- **Main baseline:** M8 merge `dfe59a2aa33be997d6b7b55b1d4f18f388efaf9a`
- **Branch:** `codex/m9-pilot-operations-foundation`
- **Migrations:** `0001`–`0024`; M8 adds project search/activity/membership permissions, with product state remaining PostgreSQL-persistent
- **Test count:** 180/180 PASS on fresh PostgreSQL 18 database `legal_document_builder_m9_final_20260901_dev`
- **Completed capabilities:** M8 baseline plus runtime readiness, independent publishing worker, `_dev` recovery verification, and permissioned project operational diagnostics without sensitive paths/content
- **Remaining capabilities:** production IAM/NAS/RPO/RTO, approved templates, official issuance/signature and AI remain later decision scope
- **Open blockers:** none for M9 merge; manual browser E2E remains deferred post-merge debt
- **Last successful build:** M9 Phase 5 — fresh migrations/seed, 180 tests, lint, production build and diff-check PASS

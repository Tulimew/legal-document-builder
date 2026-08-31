# Project State

- **Current milestone:** M9 — Deployment-neutral Pilot Operations Foundation
- **Current phase:** Scope defined; Phase 1 runtime configuration/readiness starting
- **Main baseline:** M8 merge `dfe59a2aa33be997d6b7b55b1d4f18f388efaf9a`
- **Branch:** `codex/m9-pilot-operations-foundation`
- **Migrations:** `0001`–`0024`; M8 adds project search/activity/membership permissions, with product state remaining PostgreSQL-persistent
- **Test count:** 169/169 PASS on newly migrated and seeded PostgreSQL 18 database `legal_document_builder_m8_gate_dev`
- **Completed capabilities:** authorized project registry/dashboard, route-scoped product shell, persistent editor/workflow/review/comparison/branch/publishing workbenches, and permissioned search/activity/membership views
- **Remaining capabilities:** M9 readiness, independent worker, development recovery drill and redacted operational diagnostics; production IAM/NAS/RPO/RTO/signature/AI remain later decision scope
- **Open blockers:** none for M9 Phase 1; manual browser E2E remains deferred post-merge debt
- **Last successful build:** M8 Phase 5 — 169 tests, lint, production build, migrations `0001`–`0024`, fresh seed, and diff-check PASS; manual browser E2E deferred, not certified

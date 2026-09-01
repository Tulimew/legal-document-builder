# Project State

- **Current milestone:** M9 — Deployment-neutral Pilot Operations Foundation
- **Current phase:** Phase 4 redacted operational diagnostics complete; Phase 5 final acceptance starting
- **Main baseline:** M8 merge `dfe59a2aa33be997d6b7b55b1d4f18f388efaf9a`
- **Branch:** `codex/m9-pilot-operations-foundation`
- **Migrations:** `0001`–`0024`; M8 adds project search/activity/membership permissions, with product state remaining PostgreSQL-persistent
- **Test count:** 177 tests in the current suite; Phase 2 targeted tests, lint and build PASS (full PostgreSQL gate runs at Phase 5)
- **Completed capabilities:** M8 baseline plus runtime readiness, independent publishing worker, `_dev` recovery verification, and permissioned project operational diagnostics without sensitive paths/content
- **Remaining capabilities:** M9 readiness, independent worker, development recovery drill and redacted operational diagnostics; production IAM/NAS/RPO/RTO/signature/AI remain later decision scope
- **Open blockers:** none for M9 Phase 1; manual browser E2E remains deferred post-merge debt
- **Last successful build:** M9 Phase 1 — 174 tests, lint and production build PASS; manual browser E2E deferred, not certified

# Project State

- **Current milestone:** M8 — Persistent Product Shell & Operational Workbenches
- **Current phase:** Phase 5 complete; `READY TO MERGE`; manual browser E2E deferred by project owner
- **Main baseline:** M7 verified head `b4ccd959098774a828f938a9742470e90291ca7d` (remote synchronization was unavailable when M8 started)
- **Branch:** `codex/m8-product-shell-persistent-workbenches`
- **Migrations:** `0001`–`0024`; M8 adds project search/activity/membership permissions, with product state remaining PostgreSQL-persistent
- **Test count:** 169/169 PASS on newly migrated and seeded PostgreSQL 18 database `legal_document_builder_m8_gate_dev`
- **Completed capabilities:** authorized project registry/dashboard, route-scoped product shell, persistent editor/workflow/review/comparison/branch/publishing workbenches, and permissioned search/activity/membership views
- **Remaining capabilities:** deferred manual browser E2E; production IAM, approved legal templates, NAS/object-storage deployment, backup/restore, official issuance/digital signature, and AI integration remain later operational scope
- **Open blockers:** none for the M8 merge candidate; Codex Browser Use localhost denial remains post-merge verification debt
- **Last successful build:** M8 Phase 5 — 169 tests, lint, production build, migrations `0001`–`0024`, fresh seed, and diff-check PASS; manual browser E2E deferred, not certified

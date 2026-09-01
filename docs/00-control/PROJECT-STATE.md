# Project State

- **Current milestone:** M13 — Project & System Administration
- **Current phase:** M13 merged and deployed to Synology NAS
- **Main baseline:** M13 merge `8c03cbd1bf82081156c1afcb051459acd16bc122`
- **Branch:** `main`
- **Migrations:** `0001`–`0027`; `0027` adds global administration roles, system settings, audit, document-type catalog and project creation profiles without modifying historical snapshots
- **Test count:** 213/213 PASS on fresh PostgreSQL 18 database `legal_document_builder_m13_suite_dev`
- **Completed capabilities:** M12 baseline plus governed project creation, system/account/project-creator roles, local account creation, lock/unlock controls, project-role assignment and safe registration of amendment sources
- **Remaining capabilities:** structured source ingestion/verification, membership termination or role supersede and password rotation UI are post-M13 backlog
- **Open blockers:** DSM reverse-proxy certificate hostname validation requires owner confirmation/correction; unverified amendment sources intentionally cannot become targets
- **Last successful build:** M13 Phase 2 — fresh migrations/seed and 213/213 tests PASS on PostgreSQL 18; lint/build gate PASS

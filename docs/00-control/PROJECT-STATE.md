# Project State

- **Current milestone:** M13 — Project & System Administration
- **Current phase:** Phase 2 complete — account lifecycle, project assignment and amendment-source registration
- **Main baseline:** M11 merge `9690d00fb9766c2db8e528c401fb017f1d8a433f`
- **Branch:** `codex/m13-project-and-system-administration`
- **Migrations:** `0001`–`0027`; `0027` adds global administration roles, system settings, audit, document-type catalog and project creation profiles without modifying historical snapshots
- **Test count:** 213/213 PASS on fresh PostgreSQL 18 database `legal_document_builder_m13_suite_dev`
- **Completed capabilities:** M12 baseline plus governed project creation, system/account/project-creator roles, local account creation, lock/unlock controls, project-role assignment and safe registration of amendment sources
- **Remaining capabilities:** structured source ingestion/verification, membership termination or role supersede, password rotation UI and NAS deployment of the M13 image
- **Open blockers:** amendment source cannot become a target until a real structured snapshot is imported and verified; production administrator bootstrap remains explicit
- **Last successful build:** M13 Phase 2 — fresh migrations/seed and 213/213 tests PASS on PostgreSQL 18; lint/build gate PASS

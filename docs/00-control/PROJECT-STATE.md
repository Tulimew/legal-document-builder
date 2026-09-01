# Project State

- **Current milestone:** M15 — encrypted Google Drive offsite backup
- **Current phase:** implementation and local validation
- **Main baseline:** M14 merge `b57544cff400fc9ea912de8ee2436f9825136163`
- **Branch:** `main`
- **Migrations:** `0001`–`0028`; `0028` adds explicit system permissions for reading/managing versioned structure rules
- **Test count:** 218/218 PASS on fresh PostgreSQL 18 database `legal_document_builder_m14_suite_dev`
- **Completed capabilities:** M14 baseline plus an encrypted, append-only Google Drive backup and independent download-verification foundation
- **Remaining capabilities:** real NAS rclone authorization/upload/restore drill; complete Vietnamese copy sweep of legacy/prototype routes; membership termination/role supersede and password rotation UI
- **Open blockers:** Google Drive OAuth and crypt secrets must be configured outside Git on the NAS; DSM reverse-proxy certificate hostname validation still requires owner confirmation/correction
- **Last successful build:** M14 — 218/218 tests, lint and production build PASS

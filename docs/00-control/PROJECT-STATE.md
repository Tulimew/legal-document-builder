# Project State

- **Current milestone:** M15 — encrypted Google Drive offsite backup
- **Current phase:** M15 merged and deployed to Synology NAS; encrypted upload/download verified
- **Main baseline:** M15 merge `d45fdf39d7ef42ed1f2664a5e2b76b1e47162b4e`
- **Branch:** `main`
- **Migrations:** `0001`–`0028`; `0028` adds explicit system permissions for reading/managing versioned structure rules
- **Test count:** 218/218 PASS on fresh PostgreSQL 18 database `legal_document_builder_m14_suite_dev`
- **Completed capabilities:** M14 baseline plus an encrypted, append-only Google Drive backup and independent download-verification foundation
- **Remaining capabilities:** owner-controlled Google OAuth client, DSM backup schedule and full offsite database restore drill; complete Vietnamese copy sweep of legacy/prototype routes; membership termination/role supersede and password rotation UI
- **Open blockers:** rclone shared Google Drive client ID is being retired during 2026 and must be replaced; DSM reverse-proxy certificate hostname validation still requires owner confirmation/correction
- **Last successful build:** M14 — 218/218 tests, lint and production build PASS

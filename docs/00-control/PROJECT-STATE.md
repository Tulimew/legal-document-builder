# Project State

- **Current milestone:** M14 — Vietnamese UI, governed RuleSet & source ingestion
- **Current phase:** M14 merged and deployed to Synology NAS
- **Main baseline:** M14 merge `b57544cff400fc9ea912de8ee2436f9825136163`
- **Branch:** `main`
- **Migrations:** `0001`–`0028`; `0028` adds explicit system permissions for reading/managing versioned structure rules
- **Test count:** 218/218 PASS on fresh PostgreSQL 18 database `legal_document_builder_m14_suite_dev`
- **Completed capabilities:** M13 baseline plus Vietnamese display-label foundation, governed RuleSet administration with legal-source provenance, structured original-source ingestion, immutable verification version and verified amendment-target gate
- **Remaining capabilities:** complete Vietnamese copy sweep of legacy/prototype routes, membership termination/role supersede and password rotation UI
- **Open blockers:** DSM reverse-proxy certificate hostname validation still requires owner confirmation/correction; unverified amendment sources intentionally cannot become targets
- **Last successful build:** M14 — 218/218 tests, lint and production build PASS

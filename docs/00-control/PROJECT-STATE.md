# Project State

- **Current milestone:** M14 — Vietnamese UI, governed RuleSet & source ingestion
- **Current phase:** Implementation complete on M14 branch; final gate pending commit/merge/deployment
- **Main baseline:** M13 merge `8c03cbd1bf82081156c1afcb051459acd16bc122`
- **Branch:** `codex/m14-vietnamese-ruleset-source-ingestion`
- **Migrations:** `0001`–`0028`; `0028` adds explicit system permissions for reading/managing versioned structure rules
- **Test count:** 218/218 PASS on fresh PostgreSQL 18 database `legal_document_builder_m14_suite_dev`
- **Completed capabilities:** M13 baseline plus Vietnamese display-label foundation, governed RuleSet administration with legal-source provenance, structured original-source ingestion, immutable verification version and verified amendment-target gate
- **Remaining capabilities:** complete Vietnamese copy sweep of legacy/prototype routes, membership termination/role supersede and password rotation UI
- **Open blockers:** DSM reverse-proxy certificate hostname validation requires owner confirmation/correction; unverified amendment sources intentionally cannot become targets
- **Last successful build:** M14 — 218/218 tests, lint and production build PASS

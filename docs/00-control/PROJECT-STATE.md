# Project State

- **Current milestone:** M12 — Production Integrations
- **Current phase:** Infrastructure decision gate
- **Main baseline:** M11 merge `9690d00fb9766c2db8e528c401fb017f1d8a433f`
- **Branch:** `codex/m12-production-integrations`
- **Migrations:** `0001`–`0025`; `0025` adds append-only, project-scoped security rejection evidence without historical backfill
- **Test count:** 202/202 PASS on fresh PostgreSQL 18 database `legal_document_builder_m11_final_20260901_dev`
- **Completed capabilities:** M10 baseline plus fail-closed production configuration assessment, read-only deployment preflight, redacted release manifest, standalone release packaging and deployment/recovery runbook
- **Remaining capabilities:** M12 production IAM/TLS/WAF/secrets/NAS integrations; M13 browser/UAT, target recovery verification and go-live certification
- **Open blockers:** owner decisions for production identity, deployment host/ingress, publishing storage and secrets/database operations
- **Last successful build:** M11 Phase 5 — fresh migrations/seed, 202 tests, preflight, lint, standalone build/package, dependency audit and diff-check PASS

# Project State

- **Current milestone:** M12 — Production Integrations
- **Current phase:** M12 complete — awaiting merge approval
- **Main baseline:** M11 merge `9690d00fb9766c2db8e528c401fb017f1d8a433f`
- **Branch:** `codex/m12-production-integrations`
- **Migrations:** `0001`–`0026`; `0026` adds local credential material without changing stable `user_account` identity or historical data
- **Test count:** 210/210 PASS on fresh PostgreSQL 18 database `legal_document_builder_m12_gate_20260901_dev`
- **Completed capabilities:** M11 baseline plus named local production identity, signed secure sessions, Synology Compose packaging, private PostgreSQL network, NAS filesystem storage, backup and isolated restore verification tooling
- **Remaining capabilities:** M13 deploy to NAS, DSM reverse proxy/TLS, browser/UAT and target recovery/go-live certification
- **Open blockers:** none inside M12; NAS credentials and official HTTPS hostname are deployment-time M13 inputs
- **Last successful build:** M12 final gate — fresh migrations/seed, 210 tests, production preflight, lint, standalone build and diff-check PASS

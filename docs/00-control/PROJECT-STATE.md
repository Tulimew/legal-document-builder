# Project State

- **Current milestone:** M7 — Governed Publishing & Release Artifacts (scope gate)
- **Current phase:** Phase 2 complete; Phase 3 durable DOCX publishing ready to start
- **Main baseline:** `17b66a1514532576fd4f2b9648281bcea0d1ea4a`
- **Branch:** `codex/m7-governed-publishing-scope`
- **Migrations:** `0001`–`0020`; governed publishing templates, jobs, generated documents and release package foundation added
- **Test count:** 145/145 PASS on a newly migrated and seeded PostgreSQL development database
- **Completed capabilities:** M6 baseline plus persisted M7 publishing contracts, controlled template backfill, immutable constraints and put-once filesystem StoragePort with atomic checksum verification
- **Remaining capabilities:** persisted templates, StoragePort, durable publishing jobs, governed DOCX/PDF artifacts and immutable ReleasePackage
- **Open blockers:** no implementation blocker at scope stage; PDF engine choice remains an evidence gate in Phase 4
- **Last successful build:** M7 Phase 2 gate: 145/145 tests, lint/build/diff-check PASS on fresh PostgreSQL development database

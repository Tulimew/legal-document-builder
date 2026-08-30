# Project State

- **Current milestone:** M7 — Governed Publishing & Release Artifacts (scope gate)
- **Current phase:** Proposed scope drafted; implementation not started
- **Main baseline:** `17b66a1514532576fd4f2b9648281bcea0d1ea4a`
- **Branch:** `codex/m7-governed-publishing-scope`
- **Migrations:** `0001`–`0019`; persisted RuleSet/backfill, authoring finalization, merge asset projection and fresh-development bootstrap
- **Test count:** 138/138 PASS on a newly migrated and seeded PostgreSQL development database
- **Completed capabilities:** canonical rich editing; table/figure authoring; persisted RuleSet validation; LegalNode structure commands; transactional authoring finalization; structured fork/version/merge compatibility with graph/provenance evidence
- **Remaining capabilities:** persisted templates, StoragePort, durable publishing jobs, governed DOCX/PDF artifacts and immutable ReleasePackage
- **Open blockers:** no implementation blocker at scope stage; PDF engine choice remains an evidence gate in Phase 4
- **Last successful build:** M6 final gate: 138/138 tests, lint/build/diff-check PASS; browser Table/Figure autosave/reload acceptance PASS

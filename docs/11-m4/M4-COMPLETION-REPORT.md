# M4 Completion Report

## 1. Acceptance checklist

- [x] Persistent editor core reads/saves PostgreSQL workspace and no longer imports mock/localStorage business stores.
- [x] PARAGRAPH/LIST editing and TABLE/FIGURE safe rendering/editing preserve structured data, IDs and metadata.
- [x] Autosave uses 1.5-second debounce, single-flight queue, `expectedRevision`, manual Save and navigation warning; stale state does not overwrite.
- [x] Autosave creates no DraftVersion/checkpoint/change.
- [x] Arbitrary immutable DraftVersion snapshot diff uses stable LegalNode identity and supports ADDED/DELETED/MODIFIED/MOVED/RENUMBERED, REORDERED/REPARENTED and clean missing-side union.
- [x] Evolution path is returned only when `draft_version_edge` proves it; no synthetic path.
- [x] Unified provenance returns VERIFIED/MISSING/UNVERIFIED_REFERENCE/REDACTED without fabricated or leaked source data.
- [x] Live comparison/trace UI reads real APIs; comparison explanation localStorage is outside the core path.
- [x] PostgreSQL integration, browser acceptance, full tests, lint, build and diff-check pass.

## 2. Completed capabilities

Persistent structured editing, optimistic save/autosave, immutable version list/comparison, structured node diff, edge-proven evolution and unified provenance are implemented. The live comparison route now selects real versions and displays real diff/trace data.

## 3. Test/E2E evidence

- Automated suite: **87/87 PASS**, including M4 Phase 1–5 unit/integration acceptance against the development PostgreSQL database.
- Browser acceptance on the local Next.js app: selected two real versions, rendered a structured modified LegalNode (paragraph/list/table/figure), showed the proven version path and opened VERIFIED Step 4 provenance.
- Reload persistence, stale rollback, structured JSONB round-trip, authorization/redaction and absence of localStorage/mock in core paths are covered by automated tests.

## 4. Migrations

No M4 migration was required. Baseline remains migrations `0001`–`0014`; no historical backfill or invariant change was introduced.

## 5. Remaining technical debt

- Comparison/provenance pagination is bounded server-side; opaque cursor hardening and large-dataset performance measurement remain advisable before production scale.
- Paragraph/list top-level blocks still have no stable block ID, so block-level move detection remains outside M4 acceptance.
- Provenance decision→proposal bridge remains unverified where no typed evidence exists; no speculative migration/backfill was added.
- Browser acceptance uses the integrated browser plus API/PostgreSQL suite rather than a repository-installed standalone E2E runner.

## 6. Prototype outside scope

Workflow, review/deliberation workbenches outside the editor/comparison core, general branch/fork/merge, publishing/NAS, production identity and AI integration remain prototype or not implemented as documented in the scope.

## 7. Git commit map

- `86dc6ef` — Phase 1 persistent editor foundation
- `efc6b5d` — Phase 2 real DraftVersion comparison
- `4b09f89` — Phase 3 unified provenance read model
- `7c930f7` — Phase 4 real comparison and trace UI
- Phase 5 acceptance/report commit: current completion commit

## 8. Merge readiness

**READY TO MERGE.** M4 acceptance gates are satisfied on the development baseline. This is not a production-readiness, NAS-deployment, publishing or AI-readiness verdict.

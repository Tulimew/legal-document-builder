# AI Review Pack — Legal Document Builder after M3

> Baseline reviewed: `main` at `6dd23b6` on 29/08/2026 (Asia/Saigon).  
> Purpose: independent, read-only technical review. This document distinguishes runtime capability from design intent.

## Status Labels

- **IMPLEMENTED** — present in the current `main` code and exercised at the stated scope.
- **PARTIAL** — a real implementation exists, but the end-to-end/product or production scope is incomplete.
- **PROTOTYPE** — demonstrator/UI/local behavior; do not treat it as a persistent backend capability.
- **NOT IMPLEMENTED** — documented or anticipated, but no complete runtime implementation exists.
- **OPEN QUESTION** — requires a product, infrastructure, legal-domain, or governance decision.

## Current Baseline After M3

| Item | Current baseline |
| --- | --- |
| Main HEAD | `6dd23b674ff6f53bf4993a544287f33a11f39f92` — `merge: complete M3 persistent review milestone` |
| M3 status | **IMPLEMENTED** and merged to `main`; P0 technical acceptance closed. This is not production/NAS acceptance. |
| Stack | **IMPLEMENTED** — Next.js 16.3.2 App Router, React 19.2.8, TypeScript 5, PostgreSQL via `pg` 8.23.0, `docx` 9.7.1, ESLint 9 |
| Test baseline | **IMPLEMENTED** — 39/39 passing: 30 unit/validation tests and 9 M3 test/subtests using the real PostgreSQL development database |
| Lint/build | **IMPLEMENTED** — `npm.cmd run lint` passed; `npm.cmd run build` passed, including TypeScript and generation of 13 pages |
| Migrations | **IMPLEMENTED** — forward migrations `0001` through `0013`; M3 required no new migration |
| Persistent modules | **IMPLEMENTED/PARTIAL** — workspace revision/persistence, workflow instances, IAM baseline, comments, member opinions, deliberation decisions, amendment scope/layout, Step 4 proposals/decisions/finalization, DraftVersion/LegalChange creation, review resolution history and linked changes |
| Prototype modules | **PROTOTYPE/PARTIAL** — central editor presentation, version comparison graph, structural mapping, general diff views, dashboard/sample file data, several workflow/review/deliberation fallbacks and local explanation stores |
| Deployment posture | **NOT IMPLEMENTED** — production identity, NAS/object storage, publishing worker, production PDF pipeline, backup/restore verification, observability and production security hardening |

The acceptance test creates synthetic, timestamp-suffixed records in a database guarded by the `_dev` suffix. It covers comment → opinion → decision → approved Step 4 proposal → finalization → DraftVersion and LegalChange → resolution → linked change → superseding resolution history. It is not production data and is not a claim of full-system integration coverage.

## Product and Architecture Baseline

Legal Document Builder supports drafting new legal normative documents and amending existing documents. The confirmed architectural invariant is that structured legal content is the source of truth; DOCX/PDF are generated representations, not the primary content database.

- **IMPLEMENTED** — a compact TypeScript modular monolith in `app/web`, with Next.js UI and route handlers, direct SQL repositories, shared contracts in `packages/contracts`, and PostgreSQL migrations in `packages/database`.
- **PARTIAL** — domain and application rules exist in server repositories and validation modules, but they are not yet separated into the domain/application/infrastructure package structure described as the architectural target.
- **IMPLEMENTED** — PostgreSQL is the source of truth for the persistent slices named in this pack; important repository operations use explicit transactions and server-side authorization.
- **PROTOTYPE** — screens without a configured persistent context may fall back to mock data or browser localStorage.
- **NOT IMPLEMENTED** — microservices are neither required nor present. ADR-0001 deliberately selects a modular monolith for the initial product.

Do not infer that every entity in the architecture documents or database dictionary has a complete UI/API use case. Documentation includes both implemented baseline and future design.

## Capability Status After M3

| Capability | Status | Evidence and limit |
| --- | --- | --- |
| Structured legal content contract | **IMPLEMENTED** | Versioned TypeScript/JSON contracts cover snapshots, stable LegalNode IDs and paragraph/list/table/figure blocks. Full editing support for every block is **PARTIAL**. |
| Workspace persistence | **IMPLEMENTED** | PostgreSQL workspace read/write, optimistic revision, tree validation and audit. |
| Workflow persistence | **PARTIAL** | Workflow version/stage assignment and stage instances persist; some UI retains prototype fallback and the full configurable product workflow is not complete. |
| IAM/authorization baseline | **PARTIAL** | Membership, roles, delegation and server authorization exist; production identity provider is **NOT IMPLEMENTED** and development headers are not production authentication. |
| Review intake | **IMPLEMENTED/PARTIAL** | Persistent comment APIs and repositories exist; some intake/summary screens and fallback paths still use prototype stores. |
| Deliberation and decisions | **IMPLEMENTED/PARTIAL** | Opinions, options/decisions and meeting-related persistence exist; some UI paths still use localStorage fallback. |
| Multi-document amendment scope/layout | **IMPLEMENTED/PARTIAL** | Persistent targets, sources and layout configuration exist; broad production editing and source verification remain incomplete. |
| Step 4 change proposal | **IMPLEMENTED** | Persistent proposal, approval/rejection/revision decision, readiness and transactional finalization are present. |
| Persistent review resolution | **IMPLEMENTED** | Resolution creation and complete history are read from PostgreSQL; correction is append-only via increasing sequence/supersession. |
| Accepted resolution linkage | **IMPLEMENTED** | Accepted and partially accepted outcomes require linked `DraftLegalNodeChange` records and the effective DraftVersion. Linked changes must belong to that version. |
| Explained non-acceptance | **IMPLEMENTED** | `EXPLAINED_NOT_ACCEPTED` stores an explanation without fabricating a linked draft change/version. |
| Resolution transaction safety | **IMPLEMENTED** | Acceptance covers effective-version mismatch rollback and invalid actor rejection. |
| General version graph operations | **PARTIAL** | Schema/contracts support branch and parent/merge concepts; general branch/fork/merge APIs and conflict resolution are **NOT IMPLEMENTED**. |
| General version diff | **PROTOTYPE** | Comparison, timeline, mapping, markers and provenance panels exist in UI, but use mock data; there is no general PostgreSQL diff engine/API for arbitrary DraftVersions. |
| DOCX review synthesis | **IMPLEMENTED/PARTIAL** | Persistent review export includes Vietnamese text, table, resolution/explanation, linked change and before/after data. It is generated client-side and is not persisted as a governed publishing artifact. |
| DOCX verification | **IMPLEMENTED** | M3 acceptance validates OOXML/table/font/content; the generated file was opened by Microsoft Word, exported to PDF and visually checked. |
| PDF publishing | **NOT IMPLEMENTED** | Word-to-PDF during acceptance was a QA verification step, not a product publishing pipeline. |
| File/object storage | **NOT IMPLEMENTED** | No production StoragePort/NAS/S3 implementation, access-controlled download flow, checksum lifecycle or GeneratedDocument persistence. |
| AI integration | **NOT IMPLEMENTED** | AI remains optional by design and cannot approve, accept comments or overwrite the authoritative draft. |
| Production/NAS deployment | **NOT IMPLEMENTED** | No verified identity, storage, backup/restore, RPO/RTO, monitoring or security-hardening baseline. |

## Versioning and Provenance

The following are confirmed invariants and should not be casually redesigned:

- **IMPLEMENTED** — workspace autosave/revision is distinct from an immutable DraftVersion.
- **IMPLEMENTED** — Step 4 finalization locks/checks the workspace revision and creates a checkpoint, DraftVersion snapshot/hash, parent edge, LegalNode states, `DraftLegalNodeChange`, provenance bases and audit records in one transaction.
- **IMPLEMENTED** — stable LegalNode identity is distinct from display numbering; renumbering or movement must not create identity from the displayed number.
- **IMPLEMENTED** — finalized version/provenance records use database constraints/triggers to protect immutability where defined.
- **IMPLEMENTED** — a later review correction creates a new resolution sequence and supersedes the earlier record rather than updating history in place.
- **PARTIAL** — snapshot plus change/provenance data supports the intended model, but the unified provenance read model from comment/decision/proposal/change/version is not complete.
- **NOT IMPLEMENTED** — arbitrary far-version comparison, path selection, branch/fork/merge use cases and general merge conflict handling.

Any recommendation that changes stable identity, immutable records, version edges, resolution history or provenance linkage must explicitly describe forward migration, compatibility, data repair/backfill, audit impact and rollback strategy.

## PostgreSQL Integration and Test Coverage

- **IMPLEMENTED** — migrations `0001`–`0013` establish foundation, test fixture rollback, API/audit support, review/resolution, IAM, deliberation, meetings, workflow, multi-document amendment and Step 4 finalization.
- **IMPLEMENTED** — `npm.cmd test` includes `src/server/**/*.test.ts` and `src/integration/**/*.test.ts` with test concurrency set to one.
- **IMPLEMENTED** — M3's PostgreSQL acceptance covers resolution creation, history/supersession, accepted, partially accepted, explained-not-accepted, linked LegalChange, effective DraftVersion, version mismatch rollback and invalid actor behavior.
- **PARTIAL** — the 39-test suite is a reliable M3 baseline, not comprehensive E2E, browser, migration-upgrade, concurrency, accessibility, performance or security coverage.
- **PARTIAL** — the dynamic acceptance fixture creates the full M3 chain, while the static development seed does not pre-populate the same finalized LegalChange chain.

## Prototype and Local-Only Inventory

Treat these as evidence of UX/design exploration, not production capability:

- **PROTOTYPE** — `app/web/src/lib/mock-data.ts` supplies dashboard, editor, version graph, node evolution, structural mappings and comparison data.
- **PROTOTYPE** — `review-prototype-store.ts`, `deliberation-prototype-store.ts`, `workflow-prototype-store.ts` and `step4-change-store.ts` use browser localStorage.
- **PROTOTYPE/PARTIAL** — central editor, comparison document, structural mapping, timeline, trace panel, version creation dialog and comparison explanations use mock/local state even though selected workspace/review operations have persistent APIs.
- **PARTIAL** — workflow, amendment layout, deliberation, Step 4 and review components can select persistent behavior in configured development contexts but retain fallback behavior.
- **PROTOTYPE** — publishing template JSON files marked `prototype` are not an approved, governed production template system.

## DOCX Export Boundary

- **IMPLEMENTED** — M3 persistent review synthesis reads comments and draft changes from APIs backed by PostgreSQL and generates a real Word table containing Vietnamese comment, resolution/explanation, effective version, linked change, reason and before/after content.
- **IMPLEMENTED** — acceptance checks OOXML validity, Times New Roman declaration, table markup and expected content; Microsoft Word opened the document successfully.
- **PARTIAL** — export runs client-side through the `docx` package.
- **NOT IMPLEMENTED** — background publishing worker, approved template versioning, GeneratedDocument/ReleasePackage persistence, checksum/storage lifecycle, signed release gate and production PDF generation.

## Technical Debt After M3

### Critical for production, not a blocker for the completed M3 merge

- **NOT IMPLEMENTED** — production identity and authentication adapter.
- **NOT IMPLEMENTED** — production file storage/NAS integration, backup/restore proof, RPO/RTO, monitoring and security hardening.

### High

- **PARTIAL/PROTOTYPE** — editor and comparison experience mixes persistent data with mock/localStorage data and can visually imply capabilities beyond the backend.
- **PARTIAL** — no unified provenance read model or arbitrary-version diff API.
- **PARTIAL** — DOCX is not a persisted, checksummed, governed publishing artifact.
- **PARTIAL** — domain/application boundaries remain inside the Next.js application rather than fully matching the target package layout.

### Medium/Low

- **PARTIAL** — prototype and persistent modes create divergent UI behavior.
- **PARTIAL** — runtime request validation is not uniformly generated from shared schemas.
- **NOT IMPLEMENTED** — server pagination/filtering for larger review/change lists.
- **NOT IMPLEMENTED** — broad browser E2E, accessibility, responsive, concurrency and performance testing.
- **PARTIAL** — some development ID-to-node mapping and sample routes are hard-coded.
- **PARTIAL** — repository/app README text may lag behind the post-M3 baseline; use this pack and `M3-HANDOFF.md` with code/history for status verification.

## Backlog After M3

This is a candidate order, not authorization to start M4.

### P0

- **IMPLEMENTED** — M3 PostgreSQL acceptance, DOCX verification, test/lint/build and merge are closed.
- **OPEN QUESTION** — independent reviewer findings and owner disposition of those findings.

### P1

- **OPEN QUESTION** — choose the next milestone focus: persistent editor/diff, verified legal sources, or publishing/storage.
- **NOT IMPLEMENTED** — replace central editor/comparison mock state with workspace/version/change APIs.
- **NOT IMPLEMENTED** — unified provenance read model and arbitrary DraftVersion comparison.
- **NOT IMPLEMENTED** — complete branch/fork/merge and persistent conflict handling if confirmed in product scope.
- **PARTIAL** — strengthen verified source/legal-basis metadata and workflows without inferring legal validity.

### P2

- **NOT IMPLEMENTED** — publishing worker, approved template versions, GeneratedDocument, StoragePort and ReleasePackage gates.
- **NOT IMPLEMENTED** — production identity adapter and governed file access.
- **NOT IMPLEMENTED** — browser E2E for critical persistent flows.

### P3

- **OPEN QUESTION** — AI provider and data-governance policy; implementation may begin only after the complete manual flow and approval rules are established.
- **NOT IMPLEMENTED** — performance/read-model optimization, observability, accessibility/responsive hardening and NAS packaging/restore tests.

## Open Questions

- **OPEN QUESTION** — What is the approved scope and acceptance criteria for the next milestone?
- **OPEN QUESTION** — Which production identity provider and organizational directory will be used?
- **OPEN QUESTION** — What NAS/object storage, authorization, backup, RPO/RTO and concurrency constraints apply?
- **OPEN QUESTION** — Which official structure/numbering RuleSets and approval process apply to each document type?
- **OPEN QUESTION** — Which official DOCX/PDF templates and fidelity criteria apply?
- **OPEN QUESTION** — Is prototype fallback retained for demonstrations or removed once each persistent replacement is accepted?
- **OPEN QUESTION** — What data classes and providers, if any, are approved for future AI processing?

Do not answer these questions by assumption. Legal requirements, authority, deadlines and source validity require verified documents and responsible-domain confirmation.

## Important Files for Review

| Area | Files |
| --- | --- |
| Post-M3 handoff | `docs/10-handoff/M3-HANDOFF.md` |
| Architecture and ADR | `docs/10-kien-truc-ky-thuat/kien-truc-tong-the.md`, `thiet-ke-co-so-du-lieu.md`, `hop-dong-du-lieu-cau-truc.md`, `adr/0001-modular-monolith-typescript.md` |
| Workflow and review rules | `docs/04-thiet-ke-quy-trinh/nguyen-tac-workflow.md`, `docs/10-kien-truc-ky-thuat/workflow-va-dot-xu-ly.md`, `quan-ly-gop-y-va-tiep-thu.md` |
| Structured model/editor design | `packages/contracts/src`, `docs/05-mo-hinh-du-lieu`, `docs/06-thiet-ke-giao-dien/thiet-ke-structured-legal-editor.md` |
| Physical schema | `packages/database/migrations/0001_p0_04_foundation.sql` through `0013_step4_finalization.sql` |
| M3 server code | `app/web/src/server/review-repository.ts`, `step4-change-repository.ts`, `workspace-repository.ts` and corresponding API routes |
| M3 UI/export | `persistent-review-summary.tsx`, `review-export-toolbar.tsx`, `app/web/src/lib/document-exports.ts` |
| Tests | `app/web/src/integration/m3-p0.integration.test.ts`, `app/web/src/server/**/*.test.ts` |
| Prototype evidence | `app/web/src/lib/mock-data.ts`, `*-prototype-store.ts`, editor/comparison components |

## Git Milestone Map

| Commit | Meaning |
| --- | --- |
| `dc6ac65` | Initial product documentation |
| `b302ca0` | Foundational business model |
| `9698ad9` | Structured Legal Editor design |
| `e93effb` | Next.js application initialization |
| `3cfa4dd` | P0 foundation, contracts, database/API/IAM and review-to-draft prototype |
| `5347463` | Persistent workflow stage management |
| `1156b16` | Guarded development seed |
| `322c410` | M2 persistent drafting workflow and Step 4 finalization |
| `d44bd3b` | M3 persistent review resolution/history/linked changes |
| `353e460` | M3 PostgreSQL acceptance coverage and persistent DOCX completion |
| `078d1d1` | M3 project handoff |
| `6dd23b6` | Merge of the completed M3 milestone into `main` |

## Instructions for Independent Reviewer

1. Read `AI-REVIEW-PACK.md` first.
2. Read `docs/10-handoff/M3-HANDOFF.md` second, noting that its repository snapshot was written before the final merge; this pack supplies the post-merge baseline.
3. Read the architecture, data model, workflow, review-resolution and ADR documents listed above.
4. Only then review source code, migrations and tests.
5. Perform a read-only review: do not edit code, migrations, configuration or documentation.
6. Do not recommend a rewrite merely because another framework, ORM, layering pattern or service topology is preferred.
7. Distinguish **IMPLEMENTED**, **PARTIAL**, **PROTOTYPE**, **NOT IMPLEMENTED** and **OPEN QUESTION** in every material finding.
8. Cite exact file paths and tight line ranges for code findings. Separate defects from missing future scope.
9. Preserve confirmed invariants unless there is concrete evidence they are wrong. Any proposal affecting invariant, versioning, stable identity, immutable history or provenance must state migration impact, compatibility/backfill needs, audit implications and rollback/repair strategy.
10. Do not infer legal rules or production readiness from UI labels, sample data, schema capacity or future architecture documents.

## Independent Review Output Requested

Return:

1. correctness/security/data-integrity findings ordered by severity;
2. evidence for each finding, including file/line references and reproducible conditions;
3. whether the finding affects the accepted M3 slice or only future scope;
4. test gaps that could conceal a concrete defect;
5. documentation inconsistencies that could mislead implementation;
6. migration/provenance impact for any recommended schema or invariant change;
7. a concise merge-baseline verdict without editing the repository.

## Instructions for Independent Reviewer

Read and review in this order:

1. `AI-REVIEW-PACK.md`.
2. `docs/10-handoff/M3-HANDOFF.md`.
3. Relevant architecture and business documents.
4. Source code.
5. Tests and migrations.

The reviewer must:

- not edit code;
- not create a pull request;
- not change the database schema;
- not recommend a rewrite merely because of a preferred framework, pattern, ORM, or service topology;
- always distinguish **IMPLEMENTED**, **PARTIAL**, **PROTOTYPE**, and **NOT IMPLEMENTED**;
- treat **OPEN QUESTION** items as decisions requiring confirmation rather than implementation facts;
- cite evidence for material conclusions and distinguish current M3 scope from future scope;
- when proposing any change to stable identity, DraftVersion immutability, provenance, version edges, or resolution history, explicitly state the forward migration, backfill/data repair, compatibility, audit impact, and rollback strategy.

### Review discipline

- Do not manufacture findings merely to populate every severity section. If no Critical or High finding is supported by evidence, state that explicitly.
- Absence of implementation for future scope is not evidence of architectural failure.

## Priority Review Questions

Focus the independent review on these questions:

1. Is the structured legal content model sufficient for practical editing, and where are its concrete limitations?
2. Does stable LegalNode identity have weaknesses under movement, renumbering, deletion, restoration, import, or cross-version matching?
3. Is the current snapshot plus change/provenance model sufficient for long-term versioning?
4. How should arbitrary DraftVersion diff be built on the existing model without breaking confirmed invariants?
5. How should move and renumber detection be designed and distinguished from delete/add or content edit?
6. Which entities and relationships should a unified provenance read model traverse?
7. What is still missing from branch/fork/merge before that capability can be implemented safely?
8. Does the conflict and alternative-proposal model require additions, and if so, at which boundary?
9. What concrete risks exist in the current PostgreSQL transaction boundaries, locking, concurrency handling, or immutable-record enforcement?
10. Where can prototype fallback or localStorage cause inconsistency, misleading UI state, or divergent behavior from PostgreSQL?
11. Which integration, E2E, property-based, concurrency, migration, or invariant tests are still missing?
12. Is any existing architectural decision demonstrably unsafe or insufficient and therefore in need of revision before M4 begins?

For question 12, preference alone is not evidence. A recommendation to revise an accepted decision must identify a concrete risk, affected invariant, migration impact, and viable incremental alternative.

## Known Technical Debt and Open Questions

This list consolidates the accepted M3 handoff without increasing the claimed severity:

- **PROTOTYPE/PARTIAL** — the central editor and general diff/comparison experience still depend materially on mock data and localStorage; selected persistent slices do not make the whole editor persistent.
- **PARTIAL** — provenance exists across comments, decisions, Step 4 proposals, LegalChanges, DraftVersions and bases, but there is no unified provenance read model/API.
- **NOT IMPLEMENTED** — production identity provider and production authentication integration.
- **NOT IMPLEMENTED** — governed storage and publishing pipeline, including StoragePort, persisted GeneratedDocument/ReleasePackage lifecycle, approved templates and production PDF generation.
- **NOT IMPLEMENTED** — NAS deployment acceptance, verified backup/restore, RPO/RTO, monitoring and production security hardening.
- **PARTIAL/NOT IMPLEMENTED** — version graph concepts exist in schema/contracts, but general branch/fork/merge APIs, path selection and conflict resolution are incomplete.
- **PARTIAL** — the current test suite validates the accepted M3 slice, including real PostgreSQL integration, but is not full-system browser E2E, migration-upgrade, concurrency, performance, accessibility or security coverage.
- **OPEN QUESTION** — AI provider, allowed data classes, processing location, policy, evaluation and data-governance controls have not been approved.
- **OPEN QUESTION** — the product owner has not selected M4 scope; reviewer findings are inputs to that decision, not authorization to implement it.

These items are technical debt or open scope unless evidence shows that one is a blocker for a specific approved use case. Do not label every unimplemented future capability as an M3 defect.

## Required Review Output

Gemini must return a read-only report with these sections:

1. Executive Summary.
2. Strengths / decisions that should be retained.
3. Critical findings.
4. High findings.
5. Medium findings.
6. Low findings.
7. Data model concerns.
8. Versioning, diff, and provenance concerns.
9. Testing gaps.
10. Security and deployment concerns.
11. AI integration concerns.
12. Suggested sequencing before M4.
13. Decisions requiring product owner confirmation.

Every finding must include:

- **ID** — stable identifier within the report;
- **Severity** — Critical, High, Medium, or Low, with justification;
- **Evidence** — reproducible observation and exact supporting evidence;
- **Related file/module** — exact path and tight line range where applicable;
- **Risk** — concrete failure mode or consequence;
- **Recommendation** — incremental action consistent with the current architecture and invariants;
- **Migration/data impact** — forward migration, compatibility, backfill/repair, audit and rollback implications when applicable; otherwise explicitly state `None`;
- **Required before M4** — `YES` or `NO`, with a short reason.

Do not inflate severity based solely on missing future scope. Separate confirmed defects, technical debt, test gaps and open product decisions.

## Review Boundary

- The reviewer does not decide M4 scope.
- The reviewer must not independently change business invariants.
- A prototype is not automatically a defect merely because it is not yet implemented as a persistent production feature.
- The reviewer must distinguish technical debt from a blocker and identify the exact approved scenario that is blocked.
- The report is an input to the project owner's decision, not implementation authorization.
- After the independent review, ChatGPT and the project owner will classify the proposals before any work is assigned to Codex.
- The reviewer must not edit files, create commits or pull requests, change schema, merge branches, push, or begin implementation.

## Merge-Baseline Verdict

At the end of the report, state one of:

- **SOUND BASELINE**
- **SOUND WITH PRE-M4 CORRECTIONS**
- **UNSAFE TO EXTEND**

This verdict concerns the suitability of the current M3 baseline for continued development. It is not a production-readiness or NAS-deployment verdict.

The verdict must cite the findings that justify it.

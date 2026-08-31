# M8 Manual Browser E2E Checklist

> Owner-approved substitute for browser automation on 2026-08-31 because the Codex permission broker rejected localhost tab control identically in the in-app browser, Chrome and Edge despite explicit Browse/CDP Allow settings.
>
> Target: `http://localhost:3108` backed by PostgreSQL 18 database `legal_document_builder_m8_final_dev`.
>
> Status: **DEFERRED BY PROJECT OWNER on 2026-08-31**. This checklist has not been executed and no row below is claimed as PASS.

## How to record evidence

For each step, record `PASS` or `FAIL` and the visible result. A screenshot is required only for a failure or unexpected state. Do not enter production or personal data; use the development fixture values below.

## Checklist

| ID | Action | Expected visible evidence | Result |
| --- | --- | --- | --- |
| E2E-01 | Open `/` | Project selector loads without mock-data banner or backend error; three authorized development projects are available. | PENDING |
| E2E-02 | Open project **HS-DEV-TT-02** | URL becomes `/projects/10000000-0000-4000-8000-000000000404`; dashboard shows project code/name and PostgreSQL counts. | PENDING |
| E2E-03 | Use every navigation item once | Overview, Soạn thảo, Quy trình, Góp ý, So sánh, Nhánh, Xuất bản, Tìm kiếm & hoạt động all retain the same project ID in the URL. | PENDING |
| E2E-04 | In **Soạn thảo**, edit a paragraph by appending ` [M8-MANUAL-E2E]`; wait for autosave, then press **Lưu** and reload | State passes through dirty/saving to **Đã lưu**; after reload the appended text remains and structured TABLE/FIGURE content still renders. | PENDING |
| E2E-05 | Press the version action, create an immutable version using code `M8-E2E-<HHMM>`, name `M8 manual E2E`, reason `Nghiệm thu manual E2E M8`, authority `Project owner acceptance` | Success toast contains the new DraftVersion code/ID and provenance change count; editor returns to a clean state. | PENDING |
| E2E-06 | Open **Quy trình** | Assigned PostgreSQL workflow version/stages render; no prototype fallback or localStorage message appears. | PENDING |
| E2E-07 | Open **Góp ý → Nhập ý kiến**; create comment with organization `M8 E2E`, content `Ý kiến nghiệm thu manual M8`; then open the other review tabs | New comment appears in the persistent list; deliberation, decision and resolution views load without losing the comment. Existing resolution history remains visible for seeded comments. | PENDING |
| E2E-08 | Open **So sánh**, choose two distinct versions and press **So sánh**; press **Truy nguyên nút** on one change | Stable LegalNode changes render with before/after structured text; evolution says unavailable when no graph path exists; provenance shows explicit VERIFIED/MISSING/UNVERIFIED/REDACTED status rather than invented links. | PENDING |
| E2E-09 | Open **Nhánh** | Persistent branches and merge operations render; BASE/OURS/THEIRS IDs and conflict evidence/history are visible. Creating a new branch is optional because transaction behavior is already covered by PostgreSQL integration tests. | PENDING |
| E2E-10 | Open **Xuất bản** | Immutable DraftVersion selector, persistent jobs and release packages render. Existing generated artifact/package exposes Verify; no sample version is silently selected outside this project. | PENDING |
| E2E-11 | Open **Tìm kiếm & hoạt động**, search `Dự thảo` | Project-scoped results render; activity contains correlation IDs; membership cards omit external subject/user identifiers and do not claim production SSO/provisioning. | PENDING |
| E2E-12 | Return to project dashboard and reload | Updated version/comment counts or recent activity reflect the mutations; no business state disappears after reload. | PENDING |

## Failure handling

- Record the exact step, visible message and URL.
- Capture one screenshot for each distinct failure.
- Do not retry destructive mutations repeatedly.
- A failed step keeps M8 at `NOT YET READY TO MERGE` until fixed and rerun.

## Acceptance record

- Executed by: **PENDING**
- Executed at: **PENDING**
- Browser: **PENDING**
- Result: **DEFERRED — NOT EXECUTED**
- Evidence reviewed by Codex against PostgreSQL/integration gates: **PENDING**

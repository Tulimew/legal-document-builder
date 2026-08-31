# M8 Completion Report

> Trạng thái: **READY TO MERGE — MANUAL BROWSER E2E DEFERRED BY PROJECT OWNER**

## 1. Acceptance checklist

- [x] Actor chỉ thấy project có effective membership/delegation.
- [x] Dashboard và recent state được tính từ PostgreSQL theo project.
- [x] Canonical navigation giữ nguyên stable project identity.
- [x] Editor, workflow, review, comparison/provenance, branch/merge và publishing nhận project context từ route.
- [x] Canonical product path không import mock, prototype store hoặc dùng `localStorage` làm business persistence.
- [x] Search có permission, project isolation, bounded limit và cursor.
- [x] Activity/membership read model giảm thiểu dữ liệu nhạy cảm.
- [x] Fresh PostgreSQL migration/seed, full tests, lint, production build và diff-check pass.
- [ ] Manual browser E2E trên PostgreSQL thật đi qua toàn bộ canonical product path — **DEFERRED, NOT PASSED** theo quyết định của project owner ngày 2026-08-31; checklist được giữ tại `M8-MANUAL-E2E-CHECKLIST.md` để nghiệm thu sau.

## 2. Capabilities completed

- Authorized project registry, selector và dashboard.
- Route-scoped shell cho overview, drafting, workflow, review, comparison, branches, publishing và operations.
- Persistent workflow/review workbenches, không fallback sang prototype khi backend lỗi.
- Project-scoped search, activity và membership visibility baseline.
- Persistent comparison/provenance, branch/fork/merge và governed publishing UI sử dụng project identity thật.
- Publishing cho phép chọn immutable `DraftVersion`; artifact và sealed package vẫn có thao tác verify.

## 3. Test and E2E evidence

- Fresh final gate database: `legal_document_builder_m8_gate_dev` trên PostgreSQL 18.
- Migrations `0001`–`0024`: PASS theo đúng thứ tự.
- Development seed: 3 project, mỗi project có workspace/version/review fixture: PASS.
- `npm.cmd test`: **169/169 PASS**.
- `npm.cmd run lint`: PASS.
- `npm.cmd run build`: PASS; toàn bộ route `/projects/[projectId]/*` được Next.js build nhận diện.
- `git diff --check`: PASS.
- Browser automation E2E: Codex permission broker từ chối localhost giống nhau trong in-app browser, Chrome và Edge dù Browse/CDP được Allow, kể cả sau reboot và cài lại Codex. Owner đã quyết định tạm bỏ qua manual execution để không chặn delivery. Evidence này được ghi là **DEFERRED**, không phải PASS.

## 4. Migrations

- M8 thêm `0024_m8_product_operations_permissions.sql`.
- Migration bổ sung `PROJECT_SEARCH`, `PROJECT_AUDIT_READ`, `PROJECT_MEMBERSHIP_READ` và development role grants.
- Không thay stable LegalNode identity, DraftVersion immutability, version graph, provenance hay M7 artifact/package invariants.

## 5. Technical debt remaining

- Production identity/SSO và provisioning chưa được chọn.
- Production storage/NAS/object adapter, backup/restore và RPO/RTO chưa được nghiệm thu.
- Approved legal templates, official issuance và digital signature chưa có.
- Search là operational baseline, chưa phải full-text search platform quy mô lớn.
- Realtime collaborative editing không thuộc M8.

## 6. Prototypes remaining outside M8 scope

- Legacy sample routes vẫn tồn tại để development compatibility; canonical routes không phụ thuộc chúng làm source of identity.
- Một số màn hình demo cũ ngoài canonical product path vẫn có mock/prototype presentation.
- AI provider/policy/data governance chưa triển khai.

## 7. Git commit map

- `4b2307d` — `docs(m8): define persistent product shell scope`
- `7b22380` — `feat(m8): add authorized project dashboard`
- `46c7590` — `feat(m8): introduce route-scoped product shell`
- `1c32017` — `feat(m8): connect persistent operational workbenches`
- `0672c8c` — `feat(m8): add project search and activity views`
- Phase 5 acceptance commit: pending final automated gate rerun and commit.

## 8. Merge readiness

**READY TO MERGE.** Implementation, PostgreSQL integration, migration/seed, unit/integration tests, lint, production build and diff-check satisfy the active merge gates. Manual browser E2E remains explicitly deferred by the project owner and must not be inferred as passed; it is post-merge verification debt rather than a current blocker.

# M8 — Persistent Product Shell & Operational Workbenches

> Trạng thái: **IMPLEMENTATION COMPLETE — READY TO MERGE WITH OWNER-WAIVED MANUAL E2E**
>
> Baseline: M7 branch `b4ccd959098774a828f938a9742470e90291ca7d`; M7 is `READY TO MERGE`. Remote fetch was unavailable when M8 started, so M8 preserves direct ancestry from the verified M7 head.

## 1. Objective

M8 biến baseline chức năng M1–M7 thành một sản phẩm v1 có đường điều hướng và vận hành nhất quán trên dữ liệu PostgreSQL thật. Người dùng có quyền phải chọn được hồ sơ, xem dashboard, mở đúng editor/workflow/review/comparison/branch/publishing của hồ sơ đó và không bị rơi về dữ liệu giả hoặc `localStorage` khi API lỗi.

M8 không chọn production identity provider, NAS vendor, chính sách backup/RPO/RTO, mẫu pháp lý chính thức, chữ ký số hay AI provider. Những nội dung đó cần evidence hạ tầng/chính sách riêng và nằm ở milestone vận hành sau M8.

## 2. Invariants

1. PostgreSQL là source of truth cho mọi state nghiệp vụ trên đường dùng M8.
2. Lỗi API được hiển thị rõ; không fallback sang mock, sample state hoặc `localStorage`.
3. Project/document/workspace/version identity đến từ route/API hoặc lựa chọn đã được server-authorize; không lấy một sample ID làm identity nghiệp vụ.
4. Stable `LegalNode.id`, immutable `DraftVersion`, graph edge, provenance, audit và M7 artifact/package invariants không thay đổi.
5. UI ẩn thao tác không đủ; API tiếp tục là authorization boundary.
6. Không biến dữ liệu seed development thành cấu hình production.

## 3. Delivery phases

### Phase 1 — Authorized project registry and dashboard read model

- API liệt kê các project mà actor có membership/delegation hiệu lực.
- Dashboard PostgreSQL tổng hợp workspace/version, workflow, comment/resolution, merge, publishing và package state theo project.
- Trang chủ không import `mock-data`; có loading/empty/error rõ ràng.
- Cross-project rows không được lộ qua count hoặc recent activity.

### Phase 2 — Route-scoped product shell

- Canonical project route dùng stable project ID, với navigation tới overview, drafting, workflow, review, comparison, branch/merge và publishing.
- Project context được tải/authorize từ server; sample route cũ chỉ redirect development-compatible, không là nguồn identity.
- Các workbench chính nhận project/document/workspace/version context thay vì hard-code `NEXT_PUBLIC_SAMPLE_*`.

### Phase 3 — Persistent workflow and review operations

- Loại fallback prototype/localStorage khỏi workflow, review intake, deliberation, meeting và summary trên đường canonical.
- Existing PostgreSQL repositories/API được dùng lại; bổ sung read model/API tối thiểu khi thiếu.
- Loading, empty, forbidden, conflict và backend failure khác nhau; không nuốt lỗi.

### Phase 4 — Operational search, activity and administration baseline

- Tìm kiếm trong project trên metadata, version, comment và artifact/package persistent; kết quả bị giới hạn quyền và phân trang.
- Activity/audit timeline giảm thiểu nội dung nhạy cảm, có correlation và actor display an toàn.
- Trang quản trị project/membership chỉ hiển thị persistent state và capability hiện có; không giả lập provisioning hay production identity.

### Phase 5 — End-to-end product acceptance

- Browser E2E: chọn project → dashboard → editor save/version → review → comparison/provenance → branch/merge evidence → publishing/package.
- PostgreSQL integration cho isolation, pagination, stale/error rollback và authorization.
- Toàn bộ đường canonical không import `mock-data`, prototype store hoặc dùng `localStorage` cho business state.
- Fresh migration/seed, full tests, lint, production build và `git diff --check` pass.

## 4. Acceptance criteria

### Product shell

- [x] Actor chỉ thấy project được cấp quyền.
- [x] Dashboard counts/recent items được tính từ PostgreSQL và nhất quán với entity nguồn.
- [x] Empty/error/forbidden không bị trình bày như dữ liệu mẫu.
- [x] Navigation giữ đúng project identity qua các module.

### Persistent workbenches

- [x] Editor, workflow, review, comparison, branch/merge và publishing chạy từ canonical project context.
- [x] Không có business fallback sang mock/localStorage trên canonical route.
- [x] Mọi mutation giữ optimistic concurrency/transaction/audit hiện có.

### Search and operations

- [x] Search bị scope theo project và permission, có bounded limit/cursor.
- [x] Audit/activity không lộ storage key, snapshot đầy đủ, comment content hoặc metadata nhạy cảm không cần thiết.
- [x] Admin UI không tuyên bố production provisioning/SSO chưa tồn tại.

### Quality

- [x] Unit tests cho route context, state classification và pagination.
- [x] PostgreSQL integration cho authorized project list, dashboard isolation, search isolation và error behavior.
- [ ] Browser E2E trên PostgreSQL thật cho luồng sản phẩm canonical — **DEFERRED BY PROJECT OWNER on 2026-08-31** do Codex Browser Use vẫn chặn localhost sau khi thử in-app browser, Chrome, Edge, khởi động lại máy và cài lại Codex. Đây là evidence còn thiếu, không được trình bày là PASS.
- [x] `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check` pass.

## 5. Explicitly out of scope

- Chọn/tích hợp LDAP, OIDC hoặc SAML; MFA; password lifecycle.
- NAS/S3 production adapter, container deployment, TLS ingress, secrets platform.
- Backup/restore certification và định lượng RPO/RTO/capacity.
- Mẫu pháp lý production, official issuance, chữ ký số/timestamp.
- AI provider, model policy, external data transfer và automated legal decisions.
- Realtime collaborative editing.

## 6. Commit gates

1. `feat(m8): add authorized project dashboard`
2. `feat(m8): introduce route-scoped product shell`
3. `feat(m8): connect persistent operational workbenches`
4. `feat(m8): add project search and activity views`
5. `test(m8): complete persistent product acceptance`

## 7. Definition of Done

M8 là `READY TO MERGE` khi một actor development có membership thật có thể đi từ danh sách hồ sơ qua toàn bộ capability M1–M7 bằng canonical project context và PostgreSQL state, không cần sample identity, mock fallback hoặc localStorage business persistence. Owner đã tạm miễn browser/manual E2E ngày 2026-08-31 để không chặn hoàn thiện sản phẩm; automated tests và PostgreSQL integration là merge gate hiện hành, còn manual E2E được giữ thành post-merge verification debt. Verdict này chưa phải production deployment/IAM/NAS readiness.

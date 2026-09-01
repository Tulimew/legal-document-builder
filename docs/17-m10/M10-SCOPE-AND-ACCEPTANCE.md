# M10 — Application Security & Governance Hardening

> Trạng thái: **OWNER-AUTHORIZED AUTONOMOUS IMPLEMENTATION**
>
> Baseline: `main` tại merge commit M9 `4ad66a2f4e3344cf9838900132a8f5277c24bd6a`.

## 1. Mục tiêu

M10 harden ranh giới HTTP, authorization và audit của modular monolith trước khi lựa chọn production identity/storage/deployment provider. Milestone tập trung vào invariant có thể kiểm chứng trong ứng dụng: mutation request an toàn, response header, payload bound, permission matrix, audit bất biến và security diagnostics đã giảm thiểu dữ liệu.

M10 không chọn hoặc giả lập production IAM/SSO, WAF/reverse proxy, secrets manager, NAS/S3, TLS certificate, chữ ký số hay AI provider.

## 2. Invariants

1. API authorization vẫn là boundary; UI visibility không thay thế permission check.
2. Mutation không được chấp nhận từ origin ngoài cấu hình, content type sai hoặc body vượt giới hạn.
3. Security response không tiết lộ secret, stack trace, storage path hoặc business payload.
4. Audit/provenance/version/publishing evidence đã ghi không được sửa hoặc xóa qua đường ứng dụng thông thường.
5. Security control không được làm suy yếu optimistic concurrency, transaction rollback hoặc manual non-AI workflow.
6. Development bypass phải hiển thị rõ và fail closed ngoài chế độ development.

## 3. Phases

### Phase 1 — HTTP security boundary

- Security headers cho API/page response ở application layer, tương thích localhost development.
- Origin/host validation cho mutation và JSON content-type/body-size enforcement dùng chung.
- Correlation ID validation/bounds; không phản chiếu header tùy ý.
- Unit/API tests cho rejected origin, media type, oversized body và safe error response.

### Phase 2 — Authorization governance

- Machine-testable permission matrix cho canonical project APIs.
- Chứng minh unknown, expired, cross-project và insufficient-role actors bị từ chối.
- Development identity headers không được tin cậy khi `AUTH_MODE` khác development.
- Không chọn production provider; giữ identity adapter boundary.

### Phase 3 — Audit integrity

- Migration `0025` bảo vệ audit/security evidence khỏi update/delete và bổ sung index/constraint tối thiểu nếu có evidence.
- Không backfill actor, correlation hoặc metadata bằng suy đoán.
- Security rejection logging chỉ lưu loại sự kiện/correlation tối thiểu, không lưu request body/secret.

### Phase 4 — Security diagnostics

- Project operations hiển thị posture cấu hình, audit integrity và recent rejection counts có permission.
- Không trả IP, raw user-agent, external identity subject, request body, storage key hoặc connection detail.
- Development-only/bypass status được gắn nhãn, không trình bày là production secure.

### Phase 5 — Acceptance

- Fresh migrations `0001`–`0025`, development seed và PostgreSQL integration.
- Full tests, lint, production build, dependency audit ở mức khả dụng và `git diff --check`.
- Manual browser E2E tiếp tục `DEFERRED — NOT EXECUTED` theo quyết định owner; không ghi PASS.

## 4. Acceptance criteria

### HTTP boundary

- [ ] Mutation sai origin/content type/body limit bị từ chối trước nghiệp vụ.
- [ ] Safe methods/liveness/readiness không bị CSRF control chặn sai.
- [ ] Security headers và bounded correlation ID có test.

### Authorization

- [ ] Canonical mutation/read API quan trọng có permission assertion được kiểm tra máy.
- [ ] Unknown/expired/cross-project/insufficient actor bị từ chối.
- [ ] Development identity không thể bật ngầm ngoài cấu hình development.

### Audit

- [ ] Audit evidence update/delete bị database từ chối.
- [ ] Security rejection evidence append-only và không chứa payload/secret.
- [ ] Migration không sửa hoặc đoán dữ liệu lịch sử.

### Diagnostics and quality

- [ ] Security diagnostics có quyền, project-scoped và redacted.
- [ ] Fresh database migrations/seed và full PostgreSQL suite pass.
- [ ] Lint, production build và diff-check pass; completion report phân biệt app hardening với production certification.

## 5. Mandatory stop points

- Lựa chọn/tích hợp OIDC/SAML/LDAP hoặc thay production identity invariant.
- Chọn reverse proxy/WAF/TLS/secrets/NAS/cloud provider.
- Thu thập IP/device fingerprint hoặc dữ liệu giám sát cá nhân.
- Thay đổi retention, legal hold, chữ ký số hoặc chính sách audit đã chốt.
- Thêm dependency security nền tảng lớn hoặc service ngoài tiến trình.

## 6. Commit gates

1. `feat(m10): harden HTTP request boundaries`
2. `test(m10): verify canonical authorization matrix`
3. `fix(m10): make audit evidence append-only`
4. `feat(m10): expose redacted security diagnostics`
5. `test(m10): complete security governance acceptance`

## 7. Definition of Done

M10 là `READY TO MERGE` khi HTTP mutation boundary, permission matrix, audit immutability và redacted diagnostics được chứng minh trên fresh PostgreSQL database mà không cần giả định production provider. Verdict không phải pentest, production IAM/TLS/WAF hoặc deployment certification.

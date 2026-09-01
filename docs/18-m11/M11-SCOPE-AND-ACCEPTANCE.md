# M11 — Release Candidate & Deployment Readiness

> Trạng thái: **IMPLEMENTATION AUTHORIZED — PROVIDER-NEUTRAL SCOPE**
>
> Baseline: `main` tại merge commit M10 `0829a642ce6031cae412722139fe4dfb7fbf646e`.

## 1. Mục tiêu

M11 biến application baseline sau M10 thành release-candidate có thể đóng gói, kiểm tra cấu hình và vận hành lặp lại mà chưa khóa nhà cung cấp IAM, NAS/object storage, reverse proxy hay secrets manager. M11 tập trung vào production-mode fail-closed, deployment preflight, migration/recovery runbook, artifact packaging và acceptance tự động.

M11 không tự chọn OIDC/SAML/LDAP, NAS/S3, WAF/TLS, chữ ký số, AI provider hoặc hạ tầng production cụ thể.

## 2. Invariants

1. Production mode không được tin development identity headers hoặc authorization bypass.
2. Secret và connection detail không xuất hiện trong client bundle, diagnostics, logs, manifest hoặc error response.
3. Deploy/preflight không tự sửa hoặc backfill dữ liệu lịch sử.
4. Migration vẫn forward-only, có checksum và fail closed khi schema chưa đủ.
5. Publishing/recovery vẫn đi qua port hiện có; không giả lập provider production.
6. Release candidate không được tuyên bố production-ready khi browser/UAT và hạ tầng đích chưa nghiệm thu.

## 3. Phases

### Phase 1 — Production-mode configuration contract

- Tách cấu hình build/runtime và xác định biến bắt buộc theo capability.
- Production preflight fail closed cho identity adapter, storage adapter, database, migration và worker.
- Kiểm tra không phản chiếu secret/path trong lỗi hoặc public summary.

### Phase 2 — Deployment preflight and release manifest

- Command preflight chỉ đọc để kiểm tra database/schema/storage/configuration.
- Sinh release manifest gồm commit, migration head, runtime versions và capability status không chứa secret.
- Exit code rõ cho automation; không tự migrate production.

### Phase 3 — Packaging and operational runbook

- Build/package lặp lại cho web và publishing worker từ cùng commit.
- Runbook startup, migration, rollback application, backup/restore và incident triage.
- Phân biệt rollback application với database forward repair; không hứa database down-migration.

### Phase 4 — Automated release-candidate acceptance

- Fresh PostgreSQL `0001`–`0025`, seed development và full integration suite.
- Production-mode negative tests: missing identity provider, development headers/bypass, missing storage và stale migration.
- Kiểm tra generated package/manifest không chứa `.env`, credential, token, private key, dump hoặc dữ liệu production.

### Phase 5 — Completion gate

- Full tests, lint, production build, dependency audit và `git diff --check`.
- Completion report ghi rõ browser/UAT và target-infrastructure verification còn deferred.
- Push branch và dừng tại `READY TO MERGE`; không tự merge.

## 4. Acceptance criteria

- [ ] Production-mode preflight fail closed và không dùng development identity.
- [ ] Preflight là read-only, có exit code máy đọc được và output redacted.
- [ ] Release manifest truy ngược được commit/migration/runtime nhưng không chứa secret/path nhạy cảm.
- [ ] Web và worker được build/package từ cùng immutable source revision.
- [ ] Runbook nêu startup order, migration safety, backup/restore và rollback boundary.
- [ ] Fresh PostgreSQL suite, lint, build, dependency audit và diff-check pass.
- [ ] Manual browser E2E tiếp tục ghi đúng trạng thái thực tế, không tự suy diễn PASS.

## 5. Mandatory stop points

- Chọn hoặc tích hợp IAM/SSO provider thực tế.
- Chọn NAS/S3/storage, secrets manager, reverse proxy/WAF/TLS hoặc hosting provider.
- Thay retention/RPO/RTO/legal hold hoặc yêu cầu chữ ký số.
- Cần migration phá compatibility hoặc backfill lịch sử.
- Cần dependency/service nền tảng lớn.

## 6. Definition of Done

M11 là `READY TO MERGE` khi release candidate được build và preflight lặp lại, production configuration fail closed, manifest/runbook đầy đủ và các automated gate pass. Verdict không thay thế M12 production integration hoặc M13 pilot/go-live certification.

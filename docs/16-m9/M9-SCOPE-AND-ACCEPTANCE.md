# M9 — Deployment-neutral Pilot Operations Foundation

> Trạng thái: **OWNER-AUTHORIZED AUTONOMOUS IMPLEMENTATION**
>
> Baseline: `main` tại merge commit M8 `dfe59a2aa33be997d6b7b55b1d4f18f388efaf9a`.

## 1. Mục tiêu

M9 biến baseline ứng dụng M8 thành một gói có thể vận hành thử có kiểm soát trên một máy/host mà chưa khóa nhà cung cấp hạ tầng. Milestone tập trung vào kiểm tra cấu hình, readiness, tiến trình worker xuất bản, quan sát tối thiểu và diễn tập phục hồi bằng dữ liệu development.

M9 không chứng nhận production, không chọn IAM/SSO, NAS/S3, secrets platform, TLS ingress, RPO/RTO, chữ ký số, mẫu pháp lý chính thức hoặc AI provider.

## 2. Invariants

1. PostgreSQL tiếp tục là source of truth cho state nghiệp vụ; binary tiếp tục đi qua `StoragePort`.
2. Readiness phải fail closed khi database, migration bắt buộc hoặc storage không sẵn sàng; không trả trạng thái xanh giả.
3. Không trả secret, connection string, storage root hoặc dữ liệu nghiệp vụ trong health/diagnostic response.
4. Publishing worker claim job bằng transaction/lease hiện có, retry hữu hạn và dừng có kiểm soát; không tạo scheduler thứ hai trong request path.
5. Backup/restore tooling chỉ chạy với database `_dev`, ghi manifest/checksum và không tuyên bố RPO/RTO production.
6. Không thay stable LegalNode identity, DraftVersion immutability, graph/provenance, publishing lineage hoặc audit history.

## 3. Phases

### Phase 1 — Runtime configuration and readiness

- Typed runtime configuration cho database, auth mode, storage adapter/root và worker limits.
- Startup validation phân biệt missing, invalid và development-only configuration.
- Liveness không phụ thuộc downstream; readiness kiểm tra PostgreSQL, migration `0024` và storage adapter bằng thao tác không phá hủy.
- Diagnostic output giảm thiểu dữ liệu và có correlation ID.

### Phase 2 — Independent publishing worker

- Entry point riêng chạy `PublishingWorker` ngoài HTTP request lifecycle.
- Bounded polling/backoff, graceful shutdown, process exit code và structured operational log.
- Một worker lỗi không làm mất lease/evidence; job recovery vẫn theo invariant M7.
- Không thêm queue broker hoặc process manager dependency.

### Phase 3 — Development backup/restore drill

- Script tạo logical PostgreSQL dump và storage snapshot manifest cho database `_dev`.
- Manifest ghi schema migration head, thời điểm, checksum và file inventory nhưng không chứa secret.
- Restore vào database `_dev` mới, verify migration, artifact checksum/lineage và core row counts.
- Không xóa database nguồn; không chạy trên tên database không kết thúc `_dev`.

### Phase 4 — Operational diagnostics and UI status

- Trang operations hiện readiness components, worker/job backlog và verification failures từ read model có quyền.
- Không lộ storage key, actor external identity, document snapshot hoặc comment content.
- Error/stale state rõ ràng; không fallback mock/localStorage.

### Phase 5 — Acceptance

- Fresh migrations `0001–0024` và development seed.
- Unit/integration tests cho config, readiness, worker lifecycle, backup manifest/restore verification, authorization và redaction.
- Full test, lint, production build và `git diff --check` pass.
- Browser/manual E2E không là merge gate của M9 theo quyết định owner ngày 2026-08-31; trạng thái phải ghi `DEFERRED`, không ghi PASS.

## 4. Acceptance criteria

### Configuration and health

- [ ] Invalid/missing production-sensitive config fail closed với lỗi có thể hành động.
- [ ] Liveness không tiết lộ dependency; readiness phản ánh database/migration/storage thật.
- [ ] Response/log không chứa password, connection URL, storage root hay business payload.

### Worker

- [ ] Worker chạy độc lập, poll có giới hạn và graceful shutdown.
- [ ] Concurrent claim, expired lease, retry và terminal failure giữ nguyên evidence M7.
- [ ] HTTP request path không phải scheduler nền.

### Recovery drill

- [ ] Chỉ cho phép source/target `_dev` và không ghi đè source.
- [ ] Manifest/checksum đủ để phát hiện dump hoặc storage file thiếu/hỏng.
- [ ] Restore verification chứng minh migration head và artifact lineage/checksum.

### Operations UI/API

- [ ] Chỉ actor có quyền mới đọc được operational status của project.
- [ ] Backlog/failure counts đến từ PostgreSQL và bị scope theo project.
- [ ] Không lộ secret, storage path hoặc nội dung nhạy cảm.

### Quality

- [ ] PostgreSQL integration chạy trên database mới migrate/seed.
- [ ] `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check` pass.
- [ ] Completion report phân biệt pilot-operable với production-ready.

## 5. Out of scope / mandatory stop points

- Chọn hoặc tích hợp production IAM/SSO, NAS/S3, secrets manager, TLS/ingress.
- Chốt RPO/RTO, retention, disaster-recovery topology hoặc backup encryption policy.
- Official issuance, digital signature/timestamp, production legal templates.
- AI provider, data-transfer policy hoặc AI-generated legal decision.
- Container orchestrator, HA, multi-host scheduling hoặc queue broker.

Nếu implementation cần một trong các quyết định trên, cần dừng và xin ý kiến chủ dự án.

## 6. Commit gates

1. `feat(m9): add fail-closed runtime readiness`
2. `feat(m9): run publishing worker independently`
3. `test(m9): add development recovery drill`
4. `feat(m9): expose redacted operational diagnostics`
5. `test(m9): complete pilot operations acceptance`

## 7. Definition of Done

M9 là `READY TO MERGE` khi ứng dụng có thể tự phát hiện cấu hình/dependency không sẵn sàng, worker xuất bản chạy độc lập có vòng đời kiểm soát, và một development backup/restore drill chứng minh được migration cùng artifact lineage mà không làm thay đổi dữ liệu nguồn. Verdict này không phải production IAM/NAS/backup certification.

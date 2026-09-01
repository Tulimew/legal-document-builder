# M12 — Production Integration Decision Gate

> Trạng thái: **BLOCKED ON OWNER INFRASTRUCTURE DECISIONS**
>
> Baseline: `main` tại merge commit M11 `9690d00fb9766c2db8e528c401fb017f1d8a433f`.

## Mục tiêu M12

Tích hợp release candidate với identity, secrets, storage và ingress thực tế mà không thay stable LegalNode identity, DraftVersion immutability, provenance, audit hoặc publishing invariants.

## Quyết định bắt buộc

### M12-D01 — Production identity

Cần xác định hệ thống tài khoản thực tế:

- Microsoft Entra ID / OIDC;
- Active Directory nội bộ qua một identity-aware proxy;
- OIDC provider khác;
- hoặc chưa có production identity trong đợt pilot.

Không chấp nhận development headers làm production identity.

### M12-D02 — Deployment host and ingress

Cần xác định web/worker chạy trên:

- Windows Server/PC cơ quan;
- Linux server/VM;
- NAS có container runtime;
- hoặc hạ tầng khác.

Đồng thời cần xác định reverse proxy/TLS đang được cơ quan quản lý bằng IIS, Nginx, Caddy hay gateway khác.

### M12-D03 — Publishing storage

Cần xác định artifact dùng:

- thư mục local trên server;
- SMB/NAS share;
- S3-compatible object storage;
- hoặc storage khác.

Cần biết yêu cầu service account, quyền read/write, quota, backup và đường dẫn mount; không ghi credential vào Git hoặc release bundle.

### M12-D04 — Secrets and database operations

Cần xác định nơi cung cấp `DATABASE_URL`, identity secret và storage credential: service environment, Windows service account/credential store, container secret hoặc secrets manager. Cần xác định ai chạy migration, backup window và retention/RPO/RTO tối thiểu.

## Scope sau khi quyết định

1. Identity adapter và mapping immutable external subject → `user_account`/membership.
2. Provider-specific storage adapter qua `StoragePort`, checksum/immutability và concurrency tests.
3. Secrets/config injection, service startup và ingress trust boundary.
4. Approved publishing template import/verification nếu template chính thức được cung cấp.
5. Production-like integration test, recovery drill và deployment package/runbook cập nhật.

## Không làm trước quyết định

- Không cài dependency IAM/storage nền tảng.
- Không tạo migration/backfill identity bằng suy đoán.
- Không chọn reverse proxy, NAS path, TLS hoặc secrets provider thay chủ dự án.
- Không đưa credential, domain nội bộ hoặc dữ liệu production vào repository.

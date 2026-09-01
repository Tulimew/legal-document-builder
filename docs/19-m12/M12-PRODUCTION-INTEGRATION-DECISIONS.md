# M12 — Production Integration Decisions

> Trạng thái: **APPROVED AND IMPLEMENTED**
>
> Baseline: `main` tại merge commit M11 `9690d00fb9766c2db8e528c401fb017f1d8a433f`.

## Mục tiêu

Tích hợp release candidate với identity, secrets, storage và ingress thực tế mà không thay stable LegalNode identity, DraftVersion immutability, provenance, audit hoặc publishing invariants.

## Quyết định đã khóa

### M12-D01 — Production identity

Ứng dụng dùng tài khoản cục bộ theo từng người dùng, kế thừa mô hình vận hành các website Hội thao nhưng cấm tài khoản quản trị dùng chung. `user_account(external_provider_code='local', external_subject=<username>)` tiếp tục là stable identity; credential scrypt nằm trong bảng riêng. Production chỉ nhận cookie phiên HttpOnly/Secure ký HMAC và không tin development headers. Membership/role vẫn là nguồn authorization.

### M12-D02 — Deployment host and ingress

Target là Synology NAS `192.168.1.178`, Container Manager/Docker Compose. Image được build ngoài NAS và tag bằng Git SHA. Synology HTTPS reverse proxy chuyển tiếp nội bộ tới `127.0.0.1:13108`; ứng dụng và PostgreSQL không được mở trực tiếp ra LAN/WAN.

### M12-D03 — Publishing storage

Filesystem `StoragePort` sử dụng bind mount `/volume1/docker/legal-document-builder/data/publishing`. Semantics put-once, checksum, traversal/symlink protection và immutability giữ nguyên. PostgreSQL nằm tại `data/postgres`; backup nằm tại `backups` và tách khỏi artifact active.

### M12-D04 — Secrets and database operations

Container nhận config từ hai file quyền `0600` nằm ngoài Git/image tại `config/runtime.env` và `config/postgres.env`. Migration chạy one-shot bằng advisory lock trước startup. Deploy bắt buộc backup trước migration. Backup mặc định giữ 30 ngày; M13 xác nhận lịch Hyper Backup, RPO/RTO và restore drill trên NAS thật.

## Invariants triển khai

1. Không build/npm install trong `/root` hoặc phân vùng hệ thống NAS.
2. Không đưa `.env`, password, session secret, dump hoặc production data vào Git/release image.
3. PostgreSQL không publish port 5432.
4. Web/worker dùng cùng immutable image và migration head.
5. Rollback application chỉ dùng image tương thích forward schema; không tự reverse migration.
6. Restore verification dùng database/thư mục tạm, không ghi đè production.

## Ranh giới còn lại

- Tên DNS/chứng thư HTTPS chính thức và rule reverse proxy được cấu hình trên DSM, không lưu credential/certificate trong repository.
- Việc tạo membership/role cho user mới là thao tác quản trị có kiểm soát; provisioning không tự cấp quyền.
- M13 thực hiện deployment thật, browser/UAT, backup replication và recovery certification trước go-live.

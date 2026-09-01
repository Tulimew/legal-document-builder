# M13 Completion Report

> Verdict: **READY TO MERGE**

## Acceptance checklist

- [x] Người có `PROJECT_CREATE` tạo được hồ sơ xây dựng văn bản mới hoặc sửa đổi nhiều văn bản.
- [x] Project, membership quản lý, RuleSet, workflow, document, branch, immutable DraftVersion và workspace được tạo trong một transaction.
- [x] Quyền hệ thống tách khỏi quyền theo hồ sơ.
- [x] Có vai trò quản trị hệ thống, quản trị tài khoản và người tạo hồ sơ.
- [x] Có lớp góp ý, thành viên tổ soạn thảo và tổ trưởng với permission tối thiểu theo lớp.
- [x] Tạo, khóa, mở khóa và phân công tài khoản đều có audit.
- [x] Không cho tự khóa hoặc khóa quản trị viên hoạt động cuối cùng.
- [x] Có công cụ cấu hình hệ thống với optimistic revision.
- [x] Hồ sơ sửa đổi đăng ký được văn bản nguồn nhưng không tạo nội dung hoặc provenance giả.
- [x] Nguồn `UNVERIFIED` không thể trở thành amendment target.
- [x] 213/213 tests PASS trên PostgreSQL 18 sạch; lint, build và diff-check PASS.

## Migrations

- `0027_m13_system_administration.sql`: system roles/permissions, assignments, settings, immutable system audit, document-type catalog và project creation profile.
- Không backfill quyền quản trị bằng suy đoán, không sửa snapshot hoặc stable identity lịch sử.

## Deployment requirements

1. Backup trước migration.
2. Chạy forward migration đến `0027`.
3. Bootstrap `SYSTEM_ADMIN` rõ ràng cho tài khoản local `tangt` bằng script `admin:grant-system-role`.
4. Khởi động lại web/worker và xác minh health/readiness.

## Backlog sau M13

- Nhập và kiểm chứng structured snapshot của văn bản nguồn.
- Quy trình terminate/supersede membership và lịch sử thay đổi vai trò trên UI.
- Đổi/reset mật khẩu có chính sách vận hành.
- Mở rộng danh mục loại văn bản sau khi chủ dự án phê duyệt cấu hình nghiệp vụ.

## Commit map

- `1546a7a` — project creation, system administration foundation và migration `0027`.
- `9f89ab9` — account lifecycle, project assignment và amendment source registration.

## NAS deployment evidence — 2026-09-01

- Merge commit deployed: `8c03cbd1bf82081156c1afcb051459acd16bc122`.
- Image: `legal-document-builder:8c03cbd`.
- Backup bundle and SHA-256 verification completed before image build/migration; rollout could not reach migration while this step failed because the script is fail-fast.
- Migration `0027_m13_system_administration.sql` is recorded in the production migration ledger.
- Local account `tangt` received the explicit `SYSTEM_ADMIN` assignment; no inferred administrator backfill was used.
- PostgreSQL, web and worker containers started; web is published only at `192.168.1.178:13108`.
- LAN health is `alive`; readiness is `ready` with database, migrations and storage all `ready`.
- Login page returns HTTP 200 through the LAN endpoint.
- DSM reverse proxy returns HTTP 200 when the configured hostname is resolved to the NAS, but Windows Schannel reports a certificate principal mismatch. Certificate association/SAN for the public hostname must be confirmed in DSM before TLS is marked verified.

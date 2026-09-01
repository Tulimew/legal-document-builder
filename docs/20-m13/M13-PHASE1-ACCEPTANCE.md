# M13 Phase 1 — Tạo hồ sơ và quản trị hệ thống

## Phạm vi đã triển khai

- Tạo hồ sơ từ giao diện với loại văn bản cấu hình trong PostgreSQL.
- Phân biệt `NEW_DOCUMENT` và `AMEND_DOCUMENTS`; số văn bản nguồn dự kiến được lưu rõ ràng.
- Khởi tạo transactionally project, profile, membership quản lý, RuleSet, workflow, legal document, nhánh chính, DraftVersion bất biến và workspace.
- Tách quyền hệ thống khỏi quyền theo hồ sơ: `SYSTEM_ADMIN`, `ACCOUNT_ADMIN`, `PROJECT_CREATOR`.
- Tạo tài khoản local và tùy chọn gán lớp `COMMENT_CONTRIBUTOR`, `DRAFTER`, `DRAFTING_TEAM_LEAD` trong một hồ sơ.
- Ghi system audit cho tạo hồ sơ, tạo tài khoản và thay đổi cấu hình; mật khẩu không được ghi vào audit.

## Quyết định an toàn

- Migration không tự suy đoán ai là quản trị viên và không backfill quyền quản trị.
- Quản trị viên đầu tiên phải được bootstrap bằng lệnh `admin:grant-system-role` với một tài khoản local đã tồn tại.
- Danh mục ban đầu chỉ gồm Nghị định và Thông tư. Cấu hình mang trạng thái cần kiểm chứng/phê duyệt nghiệp vụ; không tuyên bố đây là danh mục pháp lý đầy đủ.
- Hồ sơ sửa đổi lưu số lượng văn bản đích nhưng chưa tạo provenance nguồn giả. Thông tin từng văn bản nguồn được nhập ở bước tiếp theo.

## Evidence

- Migration `0027_m13_system_administration.sql` chạy thành công sau chuỗi migration `0001`–`0026` trên PostgreSQL 18 sạch.
- Integration test PostgreSQL xác minh hai mode tạo hồ sơ, canonical checksum, lớp góp ý, quyền tối thiểu, system audit và rollback.
- Toàn suite: 213/213 PASS trên database development sạch có seed chuẩn.

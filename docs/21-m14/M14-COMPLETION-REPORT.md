# M14 Completion Report

> Trạng thái: **MERGED AND DEPLOYED**

## Capability

- Nhãn hiển thị tiếng Việt tập trung cho trạng thái, vai trò, loại cấu trúc và loại quan hệ phổ biến.
- Quản trị RuleSet có phiên bản, cấu hình node/root/quan hệ cha-con và provenance bắt buộc.
- Nhập văn bản nguồn thành `LegalNode[]` thay cho snapshot rỗng hoặc localStorage.
- Kiểm chứng append-only: tạo source version mới, sao chép chính xác snapshot và node states, ghi căn cứ kiểm chứng trong audit.
- Chỉ source version `VERIFIED` được liên kết thành amendment target.

## Migration

- `0028_m14_ruleset_and_source_ingestion.sql`: thêm `RULESET_READ` và `RULESET_MANAGE`; chỉ `SYSTEM_ADMIN` nhận hai quyền này. Không sửa dữ liệu lịch sử.

## Evidence

- Fresh PostgreSQL 18 database: `legal_document_builder_m14_suite_dev`.
- Migrations `0001`–`0028` và development seed PASS.
- Dedicated PostgreSQL integration chứng minh RuleSet/source version bất biến, structured node persistence, verification và target gate.
- 218/218 tests PASS; lint PASS; production build PASS; `git diff --check` là gate cuối trước commit.

## Ngoài phạm vi còn lại

- Nhập tự động DOCX/PDF/OCR chưa có; M14 cung cấp nhập cấu trúc thủ công có kiểm soát.
- Nội dung pháp luật thực tế và RuleSet chính thức vẫn phải do người có thẩm quyền khai báo/phê duyệt.
- Các route nguyên mẫu lịch sử không phải canonical product route chưa được coi là production UI.

## NAS deployment evidence — 2026-09-01

- Merge/image release: `b57544cff400fc9ea912de8ee2436f9825136163` / `legal-document-builder:b57544c`.
- Backup production state và SHA-256 verification hoàn tất trước build.
- Migration ledger xác nhận `0028_m14_ruleset_and_source_ingestion.sql`.
- PostgreSQL healthy; web và worker chạy image M14.
- Kiểm tra độc lập từ PC: health `alive`, readiness `ready`, database/migrations/storage đều `ready`, trang đăng nhập LAN HTTP 200.
- Lần kết nối đầu trong thời gian container vừa khởi động bị reset; bounded retry sau đó thành công. Không bỏ qua readiness gate.
- Chưa tuyên bố TLS public verified; vấn đề certificate hostname của DSM reverse proxy vẫn là hạng mục vận hành riêng.

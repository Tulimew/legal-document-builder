# M14 — Giao diện tiếng Việt, RuleSet và nhập văn bản nguồn

## Phạm vi

1. Dùng nhãn tiếng Việt cho mã trạng thái và thuật ngữ kỹ thuật trên các màn hình nghiệp vụ chính; mã lưu trữ/API không đổi.
2. Quản trị viên tạo bộ quy tắc cấu trúc có definition/version bất biến, cấu hình cây và căn cứ nguồn bắt buộc.
3. Người có quyền trong hồ sơ sửa đổi nhập văn bản gốc thành cây `LegalNode`, chọn RuleSet đang hoạt động và lưu snapshot bất biến.
4. Kiểm chứng không cập nhật phiên bản cũ mà tạo phiên bản `VERIFIED` mới; chỉ phiên bản này được đưa vào phạm vi sửa đổi.

## Invariant

- Không tự điền quy định pháp luật hoặc nguồn pháp lý.
- Mỗi RuleSet phải nêu tên nguồn, số ký hiệu, ngày ban hành, tình trạng hiệu lực, điều khoản liên quan và căn cứ phê duyệt.
- Không sửa UUID, snapshot hoặc phiên bản lịch sử.
- Nội dung tiếng Việt và quan hệ cha-con được giữ trong canonical structured snapshot và bảng node.
- Mọi mutation có authorization, transaction và audit.

## Acceptance

- [x] Có đường dẫn quản trị `/quan-tri/quy-tac-cau-truc`.
- [x] Có giao diện ba bước đăng ký → nhập cấu trúc → kiểm chứng văn bản gốc.
- [x] Nguồn chưa kiểm chứng không thể trở thành amendment target.
- [x] RuleSet version và source version không thể update/delete.
- [x] PostgreSQL JSONB giữ Unicode, stable node ID và cây cha-con.
- [x] Có migration forward-only `0028`, không backfill lịch sử.
- [x] Unit, PostgreSQL integration, lint, build và diff-check là gate bắt buộc.

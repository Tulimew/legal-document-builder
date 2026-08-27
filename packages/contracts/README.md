# @legal-document-builder/contracts

Gói hợp đồng dữ liệu có phiên bản cho Structured Legal Editor và vòng đời dự thảo.

## Phạm vi hiện tại: phiên bản 1.1

- `LegalDocumentSnapshot` và cây `LegalNode` có ID ổn định.
- Nội dung có cấu trúc, định dạng hạn chế và tham chiếu theo ID.
- Bảng có ID, caption, nguồn, trạng thái kiểm chứng và metadata mở.
- Hình/ảnh qua `FigureBlock` và asset có phiên bản; binary không nằm trong JSON.
- `DraftBranch`, `DraftWorkspace`, `DraftCheckpoint` và `DraftVersion`.
- `DraftVersionBasis`, trạng thái nút và thay đổi có truy nguyên.
- `ReviewRound`, `Comment` và `CommentResolution` cho nhập, tiếp thu và giải trình ý kiến.
- JSON Schema 2020-12 tương ứng trong `schemas/v1`.

Đây là hợp đồng trao đổi, không phải schema CSDL. Quy tắc cha-con, đánh số, mức cảnh báo và loại nút hợp lệ lấy từ RuleSet có phiên bản; không được suy ra chỉ từ các kiểu TypeScript.

## Phiên bản hóa

- `contractVersion` dùng định dạng `major.minor`.
- Producer mới dùng `1.1`; consumer phải tiếp tục nhận payload `1.0` trong cùng major.
- Thêm trường tùy chọn hoặc mã mở rộng tương thích có thể tăng minor.
- Xóa/đổi nghĩa trường, đổi kiểu hoặc siết dữ liệu đang hợp lệ phải tăng major.
- Consumer phải từ chối major chưa hỗ trợ và không được âm thầm bỏ qua bất biến nghiệp vụ.

## Kiểm tra cục bộ

Từ thư mục repository:

```powershell
app\web\node_modules\.bin\tsc.cmd -p packages\contracts\tsconfig.json
```

JSON Schema được kiểm tra cú pháp và `$ref` cục bộ trong quy trình nghiệm thu P0-03. Thư viện validation runtime sẽ được chọn khi xây P0-05.

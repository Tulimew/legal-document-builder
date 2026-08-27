# Hợp đồng dữ liệu bảng và hình

## 1. Trạng thái và phạm vi

- Mã công việc: `P0-03A`.
- Contract version: `1.1`, tương thích ngược với payload `1.0`.
- Phạm vi: bảng có metadata, ảnh/hình/sơ đồ dưới dạng asset có phiên bản và cách tham chiếu chúng từ Structured Legal Editor.
- Chưa thuộc phạm vi: giao diện upload/biên tập bảng, quét virus, xử lý ảnh, storage adapter, render DOCX/PDF và quy tắc pháp lý cụ thể.

P0-03A mở rộng [hợp đồng dữ liệu cấu trúc](hop-dong-du-lieu-cau-truc.md), không thay đổi nguyên tắc Structured Legal Editor là nguồn nội dung chính.

## 2. Nguyên tắc

1. Binary không được nhúng base64 vào document JSON.
2. Document snapshot không lưu đường dẫn nội bộ hoặc URL storage lâu dài.
3. Mỗi lần thay binary tạo `assetVersionId` mới; không ghi đè phiên bản đã được snapshot tham chiếu.
4. `DraftVersion` giữ đúng `assetVersionId` và checksum để tái tạo đầu ra.
5. Hình bắt buộc có mô tả thay thế; caption và nguồn là dữ liệu có cấu trúc.
6. Trạng thái kiểm chứng không được suy ra từ việc upload thành công.
7. Loại media, kích thước và vai trò hiển thị được kiểm tra bằng chính sách/RuleSet đã phê duyệt, không tin dữ liệu client.
8. Tệp đính kèm hồ sơ không mặc nhiên trở thành `FigureBlock`; nó tiếp tục là `SupportingDocument` hoặc `SourceDocument` đúng loại.

## 3. AssetDescriptor và AssetRef

### 3.1. AssetDescriptor

`AssetDescriptor` quản lý metadata của một phiên bản binary:

| Trường | Ý nghĩa |
| --- | --- |
| `assetId` | Định danh logic xuyên suốt các lần thay binary |
| `assetVersionId` | Phiên bản binary bất biến được snapshot tham chiếu |
| `mediaType` | MIME type đã được server xác định/kiểm tra |
| `byteSize` | Kích thước binary |
| `checksum` | SHA-256 của đúng binary |
| `originalFileName` | Tên gốc phục vụ hiển thị/audit, không dùng làm storage key |
| `verificationStatus` | Mã trạng thái kiểm chứng cấu hình |
| `source` | Nguồn nghiệp vụ nếu có |
| `metadata` | Metadata mở đã được làm sạch |
| `createdAt`, `createdBy` | Dấu vết tạo phiên bản asset |

`AssetDescriptor` không chứa storage key trong hợp đồng công khai. Infrastructure ánh xạ `assetVersionId` tới vị trí lưu trữ và chỉ trả binary sau khi kiểm tra quyền.

### 3.2. AssetRef

`AssetRef` là phần tối thiểu được đặt trong nội dung:

```text
assetId
assetVersionId
mediaType
byteSize
checksum { algorithm, value }
```

Checksum dùng SHA-256 và biểu diễn bằng 64 ký tự hex. Khi đọc hoặc xuất bản, server phải xác nhận metadata trong ref khớp asset đã lưu; client không có quyền tự chứng nhận checksum.

## 4. FigureBlock

`FigureBlock` dùng chung cho ảnh raster, sơ đồ vector đã được cho phép, biểu đồ kết xuất và hình minh họa.

| Trường | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `kind = FIGURE` | Có | Discriminator của content block |
| `figureId` | Có | ID ổn định của hình trong nội dung |
| `asset` | Có | Asset version bất biến |
| `alternativeText` | Có | Mô tả thay thế có ý nghĩa |
| `caption` | Không | Các paragraph có cấu trúc |
| `source` | Không | Căn cứ/nguồn nghiệp vụ |
| `verificationStatus` | Có | Trạng thái kiểm chứng |
| `displayRoleCode` | Có | Vai trò do cấu hình quản lý, ví dụ minh họa hoặc sơ đồ |
| `metadata` | Có | Thuộc tính mở không chứa CSS tùy ý |

Không lưu kích thước hiển thị tự do, float, CSS hoặc căn lề trực tiếp trong nội dung. RuleSet và template xuất bản ánh xạ `displayRoleCode` cùng metadata đã được cho phép sang cách trình bày.

## 5. TableBlock phiên bản 1.1

Các payload bảng 1.0 chỉ có `kind` và `rows` vẫn hợp lệ. Producer 1.1 nên bổ sung:

- `tableId` để truy nguyên bảng ổn định;
- `caption` là paragraph có cấu trúc;
- `source` nếu bảng phát sinh từ tài liệu/dữ liệu nguồn;
- `verificationStatus`;
- `metadata` đã được giới hạn theo cấu hình.

Hàng và ô tiếp tục có ID riêng. `rowSpan` và `columnSpan` chỉ mô tả cấu trúc; domain phải kiểm tra lưới không chồng lấn, số cột nhất quán và giới hạn kích thước.

Không lưu HTML table, style Word hoặc dữ liệu Excel nhúng làm nguồn chính. Nếu nhập từ Excel/CSV, kết quả phải được chuyển thành `TableBlock`, hiển thị preview và được người dùng xác nhận.

## 6. Phụ lục và tài liệu đính kèm

- Phụ lục thuộc nội dung văn bản là `LegalNode` trong cùng `LegalDocumentSnapshot`; cây con có thể chứa paragraph, list, table và figure.
- Thêm/xóa/đổi thứ tự phụ lục chịu RuleSet và tạo thay đổi có truy nguyên.
- Tài liệu đính kèm hồ sơ được quản lý riêng; chỉ khi một asset được chèn có chủ đích vào nội dung thì document mới chứa `FigureBlock` tham chiếu asset đó.
- Một binary có thể được nhiều figure tham chiếu, nhưng mỗi vị trí hình có `figureId`, caption và ngữ cảnh truy nguyên riêng.

## 7. Validation ngoài JSON Schema

Ngoài kiểm tra hình dạng payload, application/domain/infrastructure phải kiểm tra:

- asset và asset version tồn tại, thuộc phạm vi người dùng được truy cập;
- checksum, media type và byte size khớp binary thực tế;
- file đã qua kiểm tra an toàn theo chính sách;
- media type nằm trong allowlist của phạm vi triển khai;
- asset chưa bị cách ly hoặc thu hồi;
- alternative text và caption đáp ứng yêu cầu của RuleSet/template;
- nguồn và trạng thái kiểm chứng đủ điều kiện sử dụng;
- mọi cell ID, row ID, table ID và figure ID duy nhất trong phạm vi tương ứng;
- bảng không có cell overlap hoặc span vượt lưới;
- snapshot không tham chiếu asset version có thể thay đổi tại chỗ;
- người dùng có quyền chèn, thay hoặc loại bỏ asset tại nút đó.

## 8. An toàn và riêng tư

- Tên tệp gốc không được dùng trực tiếp làm đường dẫn.
- Loại MIME do server kiểm tra, không chỉ lấy từ header client.
- Metadata ảnh có thể chứa vị trí, thiết bị hoặc tác giả; phải có bước giảm thiểu metadata theo chính sách P0-10.
- SVG hoặc định dạng có nội dung chủ động chỉ được phép sau khi có cơ chế làm sạch và sandbox phù hợp.
- Không ghi binary, base64, storage key hoặc URL ký tạm thời vào audit log.
- Hạn mức dung lượng, độ phân giải và số asset trong một hồ sơ được cấu hình sau khi khảo sát NAS.

## 9. Tương thích 1.0 → 1.1

- Schema chấp nhận `contractVersion` là `1.0` hoặc `1.1` trong major 1.
- Producer dùng hằng `CONTRACT_VERSION = "1.1"`.
- `FigureBlock` là biến thể mới; consumer 1.0 phải từ chối payload có block chưa hỗ trợ thay vì bỏ hình âm thầm.
- Các trường mới của `TableBlock` là tùy chọn để bảng 1.0 tiếp tục hợp lệ.
- Khi ghi lại payload 1.0, hệ thống phải migration hoặc giữ nguyên semantics; không tự tạo nguồn/trạng thái kiểm chứng giả.

## 10. Tiêu chí nghiệm thu P0-03A

- [x] Có `AssetRef`, `AssetDescriptor` và checksum SHA-256.
- [x] Binary không nằm trong JSON hoặc hợp đồng công khai.
- [x] Có `FigureBlock` với asset version, alternative text, caption, nguồn và trạng thái kiểm chứng.
- [x] Bảng 1.1 có ID, caption, nguồn, trạng thái và metadata nhưng vẫn nhận bảng 1.0.
- [x] Phân biệt phụ lục nội dung với tài liệu đính kèm hồ sơ.
- [x] Có TypeScript types và JSON Schema tương ứng.
- [x] Fixture chứa cả bảng và hình bằng dữ liệu giả định.
- [x] Có quy tắc tương thích 1.0 → 1.1.
- [x] Có danh sách validation, bảo mật và nội dung hoãn sang frontend/storage/publishing.

Hạng mục tiếp theo cho năng lực này là trình biên tập bảng, quản lý asset và renderer; P0-04 trước hết phải ánh xạ asset metadata và quan hệ snapshot–asset version sang CSDL.

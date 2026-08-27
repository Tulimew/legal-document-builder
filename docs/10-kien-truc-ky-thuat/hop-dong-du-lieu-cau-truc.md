# Hợp đồng dữ liệu cấu trúc

## 1. Trạng thái và phạm vi

- Mã công việc: `P0-03`.
- Phiên bản hợp đồng đầu tiên: `1.0`; phiên bản hiện tại: `1.1`.
- Mã nguồn hợp đồng: [`packages/contracts`](../../packages/contracts/README.md).
- Phạm vi: nội dung pháp lý có cấu trúc, workspace, checkpoint, phiên bản, nhánh, căn cứ tạo phiên bản, trạng thái nút và thay đổi giữa phiên bản.
- Chưa thuộc phạm vi: schema CSDL vật lý, API route đầy đủ, workflow, IAM chi tiết, ReleasePackage, AmendmentOperation đầy đủ và GeneratedDocument.

Hợp đồng cụ thể hóa [kiến trúc tổng thể](kien-truc-tong-the.md) và các khái niệm tại [mô hình nội dung pháp lý có cấu trúc](../05-mo-hinh-du-lieu/mo-hinh-noi-dung-phap-ly-co-cau-truc.md). Đây không phải bộ quy tắc pháp lý; loại nút và quan hệ hợp lệ vẫn do RuleSet đã được kiểm chứng quyết định.

## 2. Mục tiêu

1. Frontend, API, domain và worker dùng cùng tên trường và ý nghĩa.
2. Nội dung Structured Legal Editor có thể lưu, so sánh và tái tạo mà không dựa vào HTML.
3. Autosave sử dụng revision để không ghi đè âm thầm.
4. `DraftVersion` là snapshot bất biến, có nhánh, cha/nguồn hợp nhất, RuleSet và ít nhất một căn cứ.
5. ID `LegalNode` không phụ thuộc số hiển thị hoặc vị trí.
6. Mọi thay đổi đã chốt phân biệt người đề xuất, người thực hiện và người quyết định.
7. Hợp đồng có version độc lập với phiên bản dữ liệu nghiệp vụ.

## 3. Hai dạng biểu diễn

| Dạng | Vị trí | Mục đích |
| --- | --- | --- |
| TypeScript | `packages/contracts/src` | Kiểm tra tĩnh và dùng chung trong codebase |
| JSON Schema 2020-12 | `packages/contracts/schemas/v1` | Validation ở biên HTTP, job và công cụ tích hợp |

TypeScript không thay thế validation runtime. Dữ liệu từ client, tệp, job hoặc tích hợp ngoài phải được kiểm tra bằng schema trước khi đi vào application/domain.

## 4. Contract version và tương thích

Mọi aggregate/snapshot/command cấp cao có `contractVersion`. Producer hiện tại phát `"1.1"`; schema cùng major vẫn nhận `"1.0"` để bảo đảm tương thích ngược.

| Loại thay đổi | Cách xử lý |
| --- | --- |
| Thêm trường tùy chọn, giữ nguyên nghĩa | Có thể tăng minor |
| Thêm mã cấu hình mà consumer đã xử lý theo kiểu mở | Có thể tăng minor |
| Đổi tên/xóa trường, đổi kiểu hoặc nghĩa | Tăng major |
| Siết schema khiến payload hợp lệ cũ bị từ chối | Tăng major hoặc có migration rõ ràng |
| Sửa lỗi tài liệu không đổi payload | Không cần đổi contract version |

Consumer phải từ chối major chưa hỗ trợ. Không dùng `contractVersion` để thay thế `DraftVersion.code`, RuleSet version hoặc workflow version.

## 5. Hợp đồng nội dung cấu trúc

### 5.1. LegalDocumentSnapshot

Snapshot gồm:

- `legalDocumentId` ổn định;
- `documentTypeCode` do danh mục cấu hình quản lý;
- loại quan hệ pháp lý ở mức khái niệm;
- metadata không chứa CSS/bố cục phụ thuộc giao diện;
- tham chiếu đúng RuleSet definition/version/code;
- danh sách phẳng `nodes` có `parentNodeId` và `orderKey`;
- quan hệ tới văn bản nguồn và trạng thái kiểm chứng.

Danh sách phẳng được chọn cho hợp đồng truyền tải để:

- ánh xạ và cập nhật nút bằng ID ổn định;
- tránh lặp dữ liệu con trong nhiều cây;
- thuận lợi kiểm tra nút mồ côi, vòng lặp và thứ tự;
- tạo projection cây ở client hoặc server từ một nguồn nhất quán.

### 5.2. LegalNode

Các trường bắt buộc:

| Trường | Ý nghĩa |
| --- | --- |
| `id` | ID ổn định, không đổi khi đánh lại số hoặc di chuyển |
| `nodeTypeCode` | Mã loại do RuleSet/danh mục quyết định |
| `parentNodeId` | Cha hiện tại; `null` cho nút gốc |
| `orderKey` | Thứ tự ổn định giữa các nút cùng cha |
| `content` | Khối nội dung có cấu trúc |
| `metadata` | Thuộc tính mở có giá trị JSON, không chứa binary |
| `lifecycleStatus` | Mã trạng thái cấu hình |

`displayNumber` là giá trị hiển thị được RuleSet tính. Người dùng không nhập trực tiếp số cấu trúc vào nội dung. `displayNumberLocked` chỉ ghi yêu cầu/trạng thái ngoại lệ; quyền và tính hợp lệ phải được domain kiểm tra.

### 5.3. Nội dung có định dạng hạn chế

Phiên bản 1.0 hỗ trợ:

- paragraph với inline span;
- list có item định danh;
- table có row/cell định danh;
- các mark đậm, nghiêng, gạch chân, chỉ số trên và chỉ số dưới;
- tham chiếu nội bộ theo `targetNodeId`;
- tham chiếu ngoài theo `sourceDocumentId` và trạng thái kiểm chứng;
- liên kết chú thích theo ID.

Phiên bản 1.1 bổ sung bảng có metadata và hình/ảnh tham chiếu asset theo [P0-03A](hop-dong-du-lieu-da-phuong-tien.md).

Không hỗ trợ HTML tùy ý, CSS, font, cỡ chữ, màu, căn lề hoặc số thứ tự do người dùng nhập.

## 6. Hợp đồng vòng đời dự thảo

### 6.1. DraftBranch

- Thuộc đúng một hồ sơ.
- Có mã, mục đích, trạng thái và điểm tách nếu có.
- Đóng/hợp nhất không xóa lịch sử.
- Một version vẫn chỉ thuộc một nhánh đích; nguồn hợp nhất được ghi riêng.

### 6.2. DraftWorkspace

- Là trạng thái có thể sửa trên một nhánh.
- Dùng `revision` tăng đơn điệu cho optimistic concurrency.
- Ghi người/thời điểm cập nhật gần nhất.
- Chứa snapshot nội dung và RuleSet đang áp dụng.
- Không được đưa trực tiếp vào gói phát hành.

### 6.3. DraftCheckpoint

- Là snapshot bất biến của một revision workspace.
- Phân biệt tự động, thủ công, trước tạo version, trước khôi phục và trước merge.
- Không phải `DraftVersion` và không được phát hành.

### 6.4. DraftVersion

- Có mã tuần tự do application cấp và không tái sử dụng.
- Snapshot bất biến sau `sealedAt`.
- `parentVersionIds` biểu diễn quan hệ cha trực tiếp.
- `mergedSourceVersionIds` ghi mọi nguồn hợp nhất ngoài quan hệ cha chính.
- Có ít nhất một `DraftVersionBasis`.
- Ghi RuleSet version để tái tạo kiểm tra/trình bày.
- Phân biệt người chốt version với người thực hiện từng thay đổi.

### 6.5. DraftVersionBasis

`basisTypeCode` và `roleCode` là mã cấu hình. `source` chứa loại, ID, version nguồn nếu có và nhãn hỗ trợ hiển thị. Hợp đồng này không thay thế `LegalBasis` về nguồn và hiệu lực pháp lý.

### 6.6. DraftLegalNodeChange

Thay đổi giữa version gồm:

- ID nút ổn định;
- trạng thái trước/sau;
- version nguồn và version bắt đầu áp dụng;
- loại biến động;
- lý do và ít nhất một căn cứ;
- người đề xuất, người thực hiện, người quyết định và thời điểm quyết định.

`DRAFT_RENUMBER` và `DRAFT_MOVE` không được chuyển thành bãi bỏ cộng bổ sung. `DRAFT_MOVE_AND_CONTENT_CHANGE` giữ cả hai trạng thái trước/sau để lớp domain tách dấu vết cấu trúc và nội dung.

## 7. Hợp đồng lưu workspace

`SaveWorkspaceCommand` là lát cắt đầu tiên cho API sau này:

```text
workspaceId
expectedRevision
document
actor
correlationId
```

Server chỉ chấp nhận khi `expectedRevision` khớp revision hiện tại và người thực hiện có quyền. Thành công trả `SaveWorkspaceResult` với revision mới và thời điểm đồng bộ do server xác nhận.

`actor` trong command hỗ trợ kiểu dùng chung nhưng backend không được tin danh tính do client tự khai báo; adapter xác thực phải đối chiếu và tạo actor thực tế trước khi gọi domain.

## 8. Bất biến phải kiểm tra ngoài JSON Schema

JSON Schema kiểm tra hình dạng payload nhưng không đủ cho các bất biến sau:

- ID nút duy nhất trong document.
- Không có vòng lặp hoặc nút mồ côi.
- Mọi `parentNodeId` trỏ nút tồn tại trong cùng snapshot.
- `orderKey` không xung đột trong cùng cha.
- Loại cha-con, số lượng và thứ tự tuân thủ RuleSet version đã gán.
- `displayNumber` phù hợp kết quả RuleSet.
- Tham chiếu nội bộ trỏ đích hợp lệ.
- Workspace và document cùng project/branch hợp lệ.
- Revision không bị ghi đè.
- Version code tuần tự và không tái sử dụng.
- Parent/merge source tạo đồ thị version hợp lệ, không có chu trình.
- Basis source tồn tại, đúng hồ sơ và đủ điều kiện sử dụng.
- Người thực hiện/quyết định có quyền tại thời điểm hành động.
- Snapshot version/checkpoint không bị sửa tại chỗ.

Các kiểm tra này thuộc domain/application và một phần được bảo vệ thêm bằng ràng buộc CSDL tại P0-04.

## 9. Nội dung có chủ đích chưa cố định

- Danh mục chính thức của `documentTypeCode`, `nodeTypeCode`, trạng thái và basis type.
- Thuật toán sinh `orderKey`.
- Cấu trúc metadata riêng cho từng loại nút.
- Kiểu biểu diễn công thức hoặc nội dung chuyên ngành.
- Giới hạn kích thước document/payload.
- Schema workflow, IAM, ReleasePackage, AmendmentOperation và publishing.
- Thư viện validation runtime và cơ chế client generation.

Các nội dung này cần được quyết định ở backlog tương ứng; không lập trình cứng vào contract v1 khi chưa được xác nhận.

## 10. Tiêu chí nghiệm thu P0-03

- [x] Có contract version và quy tắc tương thích.
- [x] Có TypeScript types độc lập framework.
- [x] Có JSON Schema 2020-12 cho nội dung và vòng đời dự thảo.
- [x] Có snapshot Structured Legal Editor không dùng HTML làm nguồn.
- [x] Có workspace revision và save command/result.
- [x] Phân biệt workspace, checkpoint và version.
- [x] Có branch, parent và merge source.
- [x] Version bắt buộc có căn cứ và RuleSet version.
- [x] Thay đổi phân biệt người đề xuất, thực hiện và quyết định.
- [x] Có danh sách bất biến phải kiểm tra ở domain/CSDL.
- [x] Dữ liệu fixture hoàn toàn giả định và được TypeScript kiểm tra.

P0-04 sẽ ánh xạ hợp đồng này sang schema CSDL mà không mặc định biến mỗi interface thành đúng một bảng.

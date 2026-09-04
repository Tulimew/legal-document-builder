# Mô hình nội dung pháp lý có cấu trúc

## 1. Mục đích và ranh giới

Tài liệu thiết kế mô hình nội dung chuẩn hóa cho Structured Legal Editor ở mức nghiệp vụ, không phải schema cơ sở dữ liệu. Mô hình này cụ thể hóa nguyên tắc dữ liệu trong [Từ điển thực thể nghiệp vụ](tu-dien-thuc-the-nghiep-vu.md), sử dụng [Bộ quy tắc cấu trúc và đánh số](bo-quy-tac-cau-truc-va-danh-so.md), hỗ trợ [thao tác sửa đổi văn bản](mo-hinh-thao-tac-sua-doi-van-ban.md), và được thể hiện qua [giao diện Structured Legal Editor](../06-thiet-ke-giao-dien/thiet-ke-structured-legal-editor.md).

Structured Legal Editor là nguồn dữ liệu nội dung chính. Chế độ trình bày truyền thống, DOCX và PDF là các đầu ra được sinh từ cùng dữ liệu cấu trúc và bộ quy tắc đã gán, không phải nguồn nội dung thứ hai.

### 1.1. Phạm vi phiên bản 1

Phiên bản 1 ưu tiên Thông tư mới và Thông tư sửa đổi, bổ sung. Mô hình khái niệm vẫn mở rộng được cho Nghị định, nhưng chưa triển khai đầy đủ cây và quy tắc Nghị định trong phiên bản này. Danh mục thành phần và quy tắc pháp lý cụ thể chỉ được công bố trong RuleSet sau khi chuyên gia pháp lý kiểm chứng căn cứ hiện hành.

## 2. LegalDocument - Văn bản pháp lý có cấu trúc

`LegalDocument` đại diện cho nội dung logic của một văn bản hoặc dự thảo đang được xây dựng. Thực thể này không đồng nhất với `DraftVersion`:

| Khái niệm | Trả lời câu hỏi | Tính chất |
| --- | --- | --- |
| `LegalDocument` | Nội dung pháp lý nào đang được mô hình hóa? | Cây nội dung, metadata, loại quan hệ với văn bản hiện hành |
| `DraftWorkspace` | Trạng thái nào đang được biên tập? | Có thể thay đổi, tự động lưu |
| `DraftVersion` | Nội dung đã được chốt ở mốc nào? | Ảnh chụp bất biến của `LegalDocument` trong một nhánh |
| `GeneratedDocument` | Nội dung được trình bày ra sao? | DOCX, PDF hoặc bản trình bày sinh từ phiên bản và mẫu |

### 2.1. Loại quan hệ pháp lý của văn bản

| Loại | Ý nghĩa nghiệp vụ | Quan hệ cần ghi |
| --- | --- | --- |
| Văn bản mới | Tạo một văn bản không nhằm trực tiếp sửa đổi, thay thế hoặc bãi bỏ một văn bản xác định | Phạm vi điều chỉnh và căn cứ xây dựng |
| Văn bản sửa đổi, bổ sung | Chứa các lệnh làm thay đổi một hoặc nhiều văn bản nguồn | Văn bản nguồn, phiên bản nguồn và danh sách `AmendmentOperation` |
| Văn bản thay thế | Dự kiến thay thế toàn bộ văn bản xác định khi có hiệu lực | Văn bản dự kiến bị thay thế và điều kiện/thời điểm áp dụng cần xác nhận |
| Văn bản bãi bỏ | Dự kiến bãi bỏ toàn bộ hoặc phần nội dung xác định | Đối tượng bị bãi bỏ và phạm vi tác động |

Một văn bản có thể có nhiều quan hệ tác động, nhưng từng quan hệ phải được khai báo rõ. Hệ thống không tự suy luận hiệu lực hoặc kết luận một văn bản đã thay thế/bãi bỏ văn bản khác khi chưa có căn cứ được kiểm chứng.

### 2.2. Dữ liệu chính

- Mã định danh ổn định của văn bản trong hệ thống.
- Loại văn bản và loại quan hệ pháp lý nêu trên.
- Metadata nhận diện và trạng thái nghiệp vụ.
- Nút gốc và toàn bộ cây `LegalNode`.
- `LegalStructureRuleSet` và phiên bản được gán.
- Các văn bản/phiên bản nguồn nếu là sửa đổi, thay thế hoặc bãi bỏ.
- Liên kết `LegalBasis`, `LegalChange`, thuật ngữ và tham chiếu.

**Cần chuyên gia pháp lý xác nhận:** danh mục loại văn bản, quan hệ tác động, điều kiện hiệu lực và cấu trúc áp dụng cho từng loại.

## 3. LegalNode - Nút nội dung pháp lý

`LegalNode` là đơn vị cấu trúc có mã định danh ổn định. Mã này không phụ thuộc số hiển thị, vị trí hiện tại hoặc tiêu đề. Di chuyển hoặc đánh lại số không làm đổi ID.

Trạng thái của cùng nút tại mỗi `DraftVersion` được lưu bằng dữ liệu cấu trúc, gồm nội dung, số/tên hiển thị, cha và trạng thái tồn tại. Chênh lệch ròng được tính từ hai trạng thái đầu-cuối; diễn biến đầy đủ lấy từ chuỗi `LegalChange` giữa các phiên bản trên đường so sánh đã chọn. Không lưu HTML diff làm nguồn dữ liệu.

So sánh trạng thái phải ánh xạ bằng ID ổn định rồi mới đối chiếu số hiển thị, ID cha và thứ tự. Biến động giữa các `DraftVersion` dùng `DRAFT_RENUMBER`, `DRAFT_MOVE`, `DRAFT_CONTENT_CHANGE` và `DRAFT_MOVE_AND_CONTENT_CHANGE`. Đổi số hoặc vị trí của cùng ID không phải bãi bỏ rồi bổ sung. Với loại kết hợp, phần chuyển vị trí và phần nội dung là hai khía cạnh có truy nguyên riêng; nội dung thêm/bỏ vẫn được tính từ trạng thái của cùng nút.

Nội dung từng tồn tại ở phiên bản trung gian nhưng không còn ở phiên bản cuối vẫn phải truy nguyên được. Không xóa thay đổi đã bị sửa tiếp, đảo ngược hoặc bãi bỏ; mỗi thay đổi ghi phiên bản bắt đầu áp dụng và người thực hiện riêng với người tạo `DraftVersion`.

### 3.1. Nhóm loại nút và phạm vi phiên bản 1

| Nhóm | Loại nút phiên bản 1 | Mục đích |
| --- | --- | --- |
| Mở đầu | Phần mở đầu | Vùng chứa quốc hiệu, tiêu ngữ, cơ quan ban hành, số/ký hiệu, địa danh/ngày tháng, tên loại/trích yếu, căn cứ và dẫn nhập dưới dạng thuộc tính hoặc nút con có cấu trúc theo RuleSet |
| Phân cấp nội dung | Chương | Nhóm điều theo chủ đề khi RuleSet cho phép |
| Phân cấp nội dung | Mục | Nhóm con trong ngữ cảnh được RuleSet cho phép |
| Phân cấp nội dung | Tiểu mục | Nhóm con chi tiết hơn khi RuleSet cho phép |
| Quy phạm | Điều | Đơn vị điều khoản được đánh số theo RuleSet |
| Quy phạm | Khoản | Thành phần trực thuộc quan hệ cha được RuleSet cho phép |
| Quy phạm | Điểm | Thành phần chi tiết thuộc quan hệ cha được RuleSet cho phép |
| Nội dung hỗ trợ | Đoạn không đánh số | Nội dung văn xuôi không có số cấu trúc riêng |
| Nội dung hỗ trợ | Danh sách | Danh sách có cấu trúc, kiểu dấu đầu dòng/đánh số bị giới hạn |
| Nội dung hỗ trợ | Bảng | Dữ liệu hàng, cột và ô có cấu trúc |
| Nội dung hỗ trợ | Chú thích | Nội dung chú thích có liên kết vị trí và kiểu rõ ràng |
| Phụ lục | Phụ lục | Nội dung phụ kèm văn bản, có cây con theo RuleSet |
| Kết thúc | Điều khoản thi hành | Nhóm điều/nội dung về tổ chức thực hiện và hiệu lực dự kiến |
| Kết thúc | Phần ký | Chức vụ, người ký và thông tin ký theo trạng thái |
| Kết thúc | Nơi nhận | Danh sách đối tượng nhận có cấu trúc |

Tên kỹ thuật, mức phân cấp, quan hệ cha-con và tính bắt buộc của từng loại do RuleSet quy định. Bảng trên là năng lực của phiên bản 1, không khẳng định mọi Thông tư đều phải hoặc được phép có tất cả các nút. Các loại cấu trúc bổ sung, bao gồm cấu trúc cần riêng cho Nghị định, thuộc khả năng mở rộng sau phiên bản 1.

### 3.2. Dữ liệu chung của nút

- ID ổn định.
- Loại nút.
- ID nút cha và thứ tự tương đối trong các nút cùng cấp.
- Nội dung có định dạng hạn chế.
- Metadata riêng theo loại nút.
- Số hiển thị được tính và trạng thái khóa số nếu có.
- Chú thích, tham chiếu chéo, thuật ngữ được định nghĩa.
- Căn cứ/nguồn liên quan và liên kết truy nguyên thay đổi.
- Trạng thái hợp lệ, cảnh báo và lịch sử chỉnh sửa.

## 4. Quan hệ cây và ràng buộc cấu trúc

Cây phiên bản 1 có đúng ba vùng gốc theo ngữ nghĩa: `DOCUMENT_HEADER` (Phần đầu), `DOCUMENT_BODY` (Phần nội dung) và `DOCUMENT_FOOTER` (Phần cuối). Đây không phải ba cấp đánh số pháp lý. Phần đầu chứa Quốc hiệu, Tiêu ngữ, cơ quan/tổ chức ban hành, số/ký hiệu, địa danh và thời gian ban hành; phần nội dung chứa tên loại, trích yếu và Chương, Mục, Tiểu mục, Điều, Khoản, Điểm; phần cuối chứa chức vụ, họ tên, chữ ký, dấu, nơi nhận và chỉ dẫn kỹ thuật. Thành phần cụ thể chỉ được sử dụng khi RuleSet đã kiểm chứng cho phép.

“Phần đầu” không đồng nghĩa với một cấp cấu trúc “Phần” nằm trên Chương.

### 4.1. Nguồn DOCX và hai loại liên kết

`SourceDocument` phân biệt văn bản bị sửa đổi, văn bản làm căn cứ điều chỉnh và văn bản liên quan. Mỗi lần import tạo phiên bản nguồn mới, giữ DOCX nguyên bản, checksum, URL nguồn, ngày thu thập, cây `SourceLegalNode` đề xuất và trạng thái kiểm chứng; không ghi đè phiên bản cũ.

Bộ nhập theo quy tắc phải giữ bảng trong DOCX thành khối `TABLE` có hàng và ô, không làm phẳng thành chuỗi đoạn. Cấu trúc nhận diện được vẫn là dữ liệu chưa kiểm chứng; các đặc điểm DOCX chưa ánh xạ được phải được cảnh báo để người nhập xử lý, không được âm thầm bỏ nội dung.

Bộ nhập theo quy tắc phải giữ bảng trong DOCX thành khối `TABLE` có hàng và ô, không làm phẳng thành chuỗi đoạn. Cấu trúc nhận diện được vẫn là dữ liệu chưa kiểm chứng; các đặc điểm DOCX chưa ánh xạ được phải được cảnh báo để người nhập xử lý, không được âm thầm bỏ nội dung.

`AmendmentOperation` mô tả nút của văn bản cũ bị dự thảo tác động. `ChangeBasisLink` là quan hệ độc lập, mô tả quy định hoặc tài liệu làm phát sinh nhu cầu thêm hay sửa một `LegalNode` của dự thảo. Nội dung bổ sung hoàn toàn mới vẫn truy nguyên được căn cứ dù không có nút cũ bị sửa.

Liên kết dùng phiên bản nguồn và ID ổn định của `SourceLegalNode`; số Điều, Khoản, Điểm chỉ là nhãn hiển thị. Liên kết tạm tới vị trí file mang trạng thái chưa kiểm chứng và không được trình bày như căn cứ đã xác nhận.

Mỗi phiên bản RuleSet xác định ma trận cấu trúc cho từng loại văn bản và phạm vi áp dụng:

| Ràng buộc | Nội dung quản lý |
| --- | --- |
| Cha-con | Loại con nào được phép trực thuộc từng loại cha |
| Thứ tự | Thứ tự tương đối bắt buộc hoặc được phép giữa các loại con |
| Số lượng | Số lượng tối thiểu và tối đa của từng loại con trong một ngữ cảnh |
| Tính bắt buộc | Nút luôn phải có, có điều kiện hoặc tùy chọn |
| Điều kiện | Điều kiện theo loại văn bản, trạng thái, phạm vi hoặc đặc điểm nội dung |

Không giả định tất cả loại văn bản sử dụng cùng một cây. Ví dụ cấu trúc được phép cho văn bản sửa đổi có thể khác văn bản mới; phụ lục có thể dùng quy tắc con riêng. Các ví dụ này chỉ minh họa khả năng cấu hình, không phải kết luận thể thức hiện hành.

Các thao tác thêm, di chuyển, tách, hợp nhất hoặc đổi loại nút phải được kiểm tra trước khi áp dụng. Giao diện không cho phép kéo thả tạo quan hệ cha-con sai.

## 5. Mã định danh, số hiển thị và tham chiếu

### 5.1. ID ổn định

- ID của `LegalNode` được tạo một lần và không đổi khi di chuyển hoặc đánh lại số.
- Nút được sao chép thành một nút mới có ID mới; quan hệ nguồn được ghi riêng.
- Nút bị bãi bỏ không được tái sử dụng ID cho nội dung khác.

### 5.2. Số hiển thị

- Số Điều, Khoản, Điểm và cấp cấu trúc khác là giá trị tính toán theo phiên bản `LegalStructureRuleSet` đã gán.
- Người soạn không nhập trực tiếp số Điều, Khoản hoặc Điểm.
- Đánh lại số không đổi ID và không làm đứt truy nguyên.
- Số đặc biệt hoặc số giữ nguyên từ văn bản cũ chỉ được sử dụng khi nhập văn bản nguồn, hoặc khi RuleSet có ngoại lệ đã được phê duyệt.
- Ngoại lệ phải ghi lý do, người phê duyệt và `AuditEvent`; xung đột đánh số phải được báo lỗi hoặc cảnh báo đúng mức do RuleSet quy định.

**Cần chuyên gia pháp lý xác nhận:** trường hợp được khóa số, cách biểu diễn số bổ sung và quy tắc đánh số của từng loại văn bản.

### 5.3. Tham chiếu nội bộ

Tham chiếu nội bộ lưu ID nút đích và kiểu tham chiếu, không chỉ lưu chuỗi hiển thị như “Điều 5”. Chuỗi hiển thị được sinh tại thời điểm trình bày. Khi đánh lại số, mọi tham chiếu hợp lệ tự hiển thị số mới; khi nút đích bị di chuyển, bãi bỏ hoặc không còn trong projection, hệ thống đưa ra cảnh báo có truy nguyên.

Tham chiếu ngoài văn bản phải ghi đủ định danh nguồn có thể kiểm chứng; hệ thống không tự xác nhận hiệu lực của nguồn.

## 6. Nội dung và định dạng hạn chế

### 6.1. Nội dung được hỗ trợ

- Văn bản thuần và các đoạn có cấu trúc.
- Đậm, nghiêng, gạch chân, chỉ số trên và chỉ số dưới khi RuleSet cho phép trong ngữ cảnh.
- Tham chiếu nội bộ theo ID và chú thích có kiểu rõ ràng.
- Thuật ngữ được định nghĩa và vị trí định nghĩa.
- Căn cứ hoặc nguồn liên quan có trạng thái kiểm chứng.
- Dấu vết chỉnh sửa liên kết người thực hiện, thời điểm, phiên bản và căn cứ phát sinh.

### 6.2. Nội dung không được coi là nguồn chính

- HTML tùy ý.
- Nội dung trình bày đã kết xuất từ DOCX/PDF.
- Số thứ tự được người dùng gõ như một phần không thể phân biệt của nội dung khi RuleSet quản lý số.
- CSS hoặc thông tin bố cục phụ thuộc một giao diện cụ thể.

Người soạn không được tự chọn font, cỡ chữ, màu, căn lề, thụt lề, khoảng cách hoặc số thứ tự cấu trúc. Các thuộc tính này do RuleSet và mẫu xuất quyết định, không được nhúng vào nội dung pháp lý.

Việc dán nội dung giàu định dạng phải được làm sạch và ánh xạ sang tập định dạng được phép; phần không ánh xạ được phải cảnh báo để người dùng xử lý.

## 7. Bất biến của mô hình

- Không có hai `LegalNode` trùng ID trong cùng không gian định danh.
- Cây không có vòng lặp.
- Mọi nút ngoài nút gốc có đúng một cha hợp lệ; không có nút mồ côi.
- Loại cha-con và số lượng con tuân thủ RuleSet đã gán.
- Thứ tự các nút cùng cấp luôn xác định và có thể tái tạo ổn định.
- Cấu trúc có lỗi chặn không được tạo `ReleasePackage` để phát hành.
- `DraftWorkspace` có thể tạm thời chứa trạng thái chưa hoàn chỉnh nhưng phải hiển thị lỗi rõ ràng.
- `DraftVersion` bất biến; chỉnh sửa tiếp theo diễn ra trong workspace và tạo phiên bản mới khi chốt.
- Dữ liệu trình bày truyền thống không được lưu thành nguồn nội dung thứ hai.
- Mọi thay đổi đã chốt phải truy ngược được về căn cứ phát sinh theo mô hình `LegalChange`.

## 8. Nội dung cần người dùng hoặc chuyên gia xác nhận

- Căn cứ hiện hành để công bố RuleSet cho Thông tư mới và Thông tư sửa đổi, bổ sung.
- Quan hệ cha-con, mức bắt buộc và thuật toán đánh số cụ thể cho từng loại Thông tư.
- Trường hợp pháp lý cho phép số đặc biệt hoặc giữ nguyên số từ văn bản cũ.
- Cách biểu diễn bảng, phụ lục và công thức/nội dung chuyên ngành nếu có.
- Nguồn chính thức dùng để kiểm chứng căn cứ và tham chiếu ngoài.
- Cây và RuleSet Nghị định khi mở rộng sau phiên bản 1.

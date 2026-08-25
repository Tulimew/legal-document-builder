# Mô hình thao tác sửa đổi văn bản

## 1. Mục đích và nguyên tắc

Tài liệu thiết kế cơ chế xây dựng dự thảo sửa đổi, bổ sung dựa trên [mô hình nội dung pháp lý có cấu trúc](mo-hinh-noi-dung-phap-ly-co-cau-truc.md). Các quy tắc cấu trúc và đánh số lấy từ [LegalStructureRuleSet](bo-quy-tac-cau-truc-va-danh-so.md); thao tác người dùng được mô tả trong [thiết kế Structured Legal Editor](../06-thiet-ke-giao-dien/thiet-ke-structured-legal-editor.md).

Mô hình lưu lệnh sửa đổi có truy nguyên thay vì chỉ lưu bản nội dung cuối. Hệ thống không tự kết luận văn bản nguồn còn hiệu lực, không tự xác định hiệu lực của thao tác và không coi bản dự kiến sau sửa đổi là văn bản hợp nhất chính thức.

## 2. Sáu đối tượng phải phân biệt

| Đối tượng | Ý nghĩa | Vai trò dữ liệu |
| --- | --- | --- |
| Văn bản gốc | Văn bản được dự kiến sửa đổi, bổ sung hoặc bãi bỏ một phần | Định danh đối tượng pháp lý nguồn |
| Phiên bản văn bản gốc tại thời điểm áp dụng | Ảnh chụp nội dung nguồn mà nhóm soạn thảo dùng làm căn cứ thao tác | Mốc nền bất biến, có nguồn và trạng thái kiểm chứng |
| Dự thảo văn bản sửa đổi | `LegalDocument` chứa nội dung dự kiến ban hành và cách diễn đạt các lệnh sửa đổi | Nội dung dự thảo được quản lý bằng workspace/version |
| Lệnh sửa đổi | `AmendmentOperation` tác động có cấu trúc lên một hoặc nhiều nút nguồn | Đơn vị truy nguyên và kiểm tra xung đột |
| Bản dự kiến nội dung sau sửa đổi | Projection được sinh từ phiên bản nguồn và tập thao tác | Công cụ kiểm tra, so sánh và cảnh báo |
| Văn bản hợp nhất chính thức, nếu có | Sản phẩm có địa vị pháp lý theo quy định và thẩm quyền tương ứng | Đối tượng riêng, chỉ ghi nhận khi có nguồn chính thức được kiểm chứng |

Phiên bản nguồn phải được đóng dấu trạng thái kiểm chứng. Nếu chưa xác nhận đầy đủ, giao diện phải hiển thị rõ “nguồn chưa được kiểm chứng”, không che giấu bằng projection trông hoàn chỉnh.

### 2.1. Nhập và kiểm chứng văn bản gốc

- Ưu tiên nhập từ DOCX hoặc dữ liệu có cấu trúc; kết quả nhập luôn cần đối chiếu.
- PDF chỉ được lưu làm tài liệu đối chiếu; không thực hiện OCR hoặc bóc tách nặng trên NAS.
- Mỗi lần nhập lưu file nguồn, thông tin nguồn, ngày thu thập và checksum.
- Người nhập và người kiểm chứng là hai vai trò khác nhau; vai trò cụ thể được gán theo hồ sơ.
- Văn bản chỉ được chọn làm nguồn của `AmendmentOperation` sau khi phiên bản nguồn đã được người có quyền kiểm chứng.
- Nhập lại hoặc thay nguồn tạo phiên bản nguồn mới; không ghi đè phiên bản đã dùng hoặc đã kiểm chứng.

Việc kiểm chứng dữ liệu nhập không đồng nghĩa tự động kết luận tình trạng hiệu lực pháp lý. Nguồn chính thức, thẩm quyền kiểm chứng và tiêu chí đối chiếu vẫn phải được chuyên gia xác nhận.

## 3. AmendmentOperation - Thao tác sửa đổi

Tên kỹ thuật sau là đề xuất để giao tiếp nhất quán; nhãn tiếng Việt và điều kiện áp dụng phải được cấu hình.

| Mã đề xuất | Tên tiếng Việt | Mô tả nghiệp vụ |
| --- | --- | --- |
| `ADD` | Bổ sung | Thêm nút hoặc nội dung mới tại vị trí xác định |
| `REPLACE` | Thay thế | Thay toàn bộ nội dung/nút đích bằng nội dung mới |
| `REPEAL` | Bãi bỏ | Đánh dấu loại bỏ hiệu lực dự kiến của nút đích khỏi projection |
| `RENAME` | Đổi tên | Đổi tiêu đề hoặc tên của một cấu phần nhưng giữ định danh mục tiêu |
| `MOVE` | Di chuyển | Chuyển nút sang vị trí/cha mới khi quy tắc cho phép |
| `SPLIT` | Tách | Chia một nút thành nhiều nút mới có quan hệ nguồn rõ ràng |
| `MERGE` | Hợp nhất | Hợp nhất nhiều nút nguồn thành nút mới có truy nguyên |
| `REPLACE_PHRASE` | Thay thế cụm từ | Thay chuỗi/phạm vi nội dung xác định trong nút |
| `REMOVE_PHRASE` | Bỏ cụm từ | Loại bỏ chuỗi/phạm vi nội dung xác định trong nút |

**Cần chuyên gia pháp lý xác nhận:** tập lệnh, cách diễn đạt trong dự thảo, phạm vi áp dụng và trường hợp một thao tác kỹ thuật không tương ứng một-một với một lệnh pháp lý.

## 4. Dữ liệu bắt buộc của thao tác

| Dữ liệu | Yêu cầu |
| --- | --- |
| Nút đích | ID ổn định của một hoặc nhiều `LegalNode`; không chỉ lưu số hiển thị |
| Phiên bản nguồn | Mốc bất biến của văn bản gốc dùng để định vị và đối chiếu |
| Nội dung trước sửa đổi | Ảnh chụp/phạm vi nội dung tại phiên bản nguồn |
| Nội dung đề xuất | Nút, nội dung hoặc phép biến đổi dự kiến |
| Vị trí chèn | ID cha/điểm neo, hướng và thứ tự theo RuleSet |
| Lý do | Giải thích nghiệp vụ của thao tác |
| Căn cứ phát sinh | `LegalBasis`, kết quả thẩm định, quyết định hoặc căn cứ hợp lệ khác |
| Ý kiến/chỉ đạo liên quan | Liên kết `Comment`, `CommentResolution`, `Meeting`, `DirectionDocument` hoặc `DirectionTask` |
| Người đề xuất | Chủ thể thực hiện đề xuất và phạm vi quyền tại thời điểm đó |
| Người phê duyệt | Chủ thể có thẩm quyền chấp nhận thao tác; AI không được đảm nhiệm |
| Trạng thái | Nháp, đề xuất, cần xử lý xung đột, được chấp nhận, bị từ chối hoặc trạng thái đã cấu hình |
| Phiên bản bắt đầu áp dụng | `DraftVersion` đầu tiên của dự thảo sửa đổi chứa thao tác đã chốt |

Mọi điều chỉnh sau khi thao tác đã chốt tạo lần sửa đổi có lịch sử hoặc thao tác thay thế, không ghi đè làm mất căn cứ cũ.

### 4.1. Phê duyệt thao tác và bản phát hành

| Trách nhiệm | Vai trò nền | Kết quả |
| --- | --- | --- |
| Tạo đề xuất | Người soạn thảo | `AmendmentOperation` ở trạng thái đề xuất, có căn cứ và dấu vết |
| Duyệt nghiệp vụ | Tổ trưởng hoặc đầu mối soạn thảo | Chấp nhận, yêu cầu sửa hoặc từ chối đề xuất về mặt nghiệp vụ |
| Duyệt bản phát hành | Người có thẩm quyền theo hồ sơ | Phê duyệt `DraftVersion`/`ReleasePackage` trong đúng phạm vi thẩm quyền |

Vai trò cụ thể phải được cấu hình theo từng hồ sơ. Người thực hiện và người chịu trách nhiệm pháp lý có thể khác nhau. Xung đột không được AI hoặc hệ thống tự quyết định; người được phân quyền phải chọn phương án và ghi lý do, căn cứ và `AuditEvent`.

## 5. Thứ tự áp dụng và khả năng tái tạo

Tập thao tác có thứ tự xác định. Thứ tự phải ổn định, giải thích được và được lưu cùng phiên bản dự thảo. Projection được tạo bằng cách:

1. nạp đúng phiên bản văn bản nguồn;
2. kiểm tra ID và dấu vết nội dung nguồn;
3. sắp xếp các thao tác theo thứ tự đã chốt;
4. kiểm tra tiền điều kiện và xung đột;
5. áp dụng thao tác hợp lệ lên bản sao tính toán;
6. đánh số và kiểm tra cấu trúc theo RuleSet phù hợp;
7. sinh cảnh báo tham chiếu và báo cáo truy nguyên.

Nếu một thao tác không áp dụng được, projection phải dừng hoặc đánh dấu phần không hoàn chỉnh theo mức lỗi; không được âm thầm bỏ qua thao tác.

## 6. Kiểm soát xung đột

| Tình huống | Kiểm tra | Cách xử lý tối thiểu |
| --- | --- | --- |
| Hai thao tác sửa cùng một nút | Phạm vi nội dung chồng lấn hoặc kết quả phụ thuộc thứ tự | Chặn hợp nhất tự động; yêu cầu chọn thứ tự, hợp nhất nội dung hoặc loại thao tác |
| Bãi bỏ nút cha trong khi sửa nút con | Một thao tác làm mất cây chứa đích của thao tác khác | Lỗi chặn trừ khi có quy tắc chuyển đổi rõ và người có thẩm quyền xác nhận |
| Chèn vào nút đã bị bãi bỏ | Điểm neo không còn trong projection tại thời điểm áp dụng | Lỗi chặn; chọn điểm neo còn hiệu lực trong projection |
| Tham chiếu đến nút bị xóa | Tham chiếu nội bộ trỏ tới nút bị `REPEAL`, thay thế hoặc tách | Cảnh báo hoặc lỗi chặn theo RuleSet; yêu cầu cập nhật/giải trình |
| Dựa trên phiên bản nguồn cũ | Nội dung hoặc dấu vết nút nguồn không khớp mốc mới | Đánh dấu thao tác lỗi thời; phải đối chiếu và xác nhận lại |
| Hợp nhất nhánh có thao tác mâu thuẫn | Hai nhánh thay đổi cùng đích theo cách không tương thích | Tạo danh sách xung đột; con người quyết định từng mục trước khi tạo `DraftVersion` hợp nhất |

Giải quyết xung đột phải lưu người thực hiện, người quyết định, phương án chọn, lý do và căn cứ. AI chỉ có thể gợi ý phương án.

## 7. Bản dự kiến nội dung sau sửa đổi

`ConsolidatedProjection` là bản dự kiến được sinh tự động, không phải nguồn nội dung độc lập và không phải văn bản hợp nhất chính thức. Projection phải:

- tái tạo được từ phiên bản văn bản gốc và danh sách thao tác theo thứ tự;
- chỉ rõ nguồn của từng thay đổi và `DraftVersion` bắt đầu áp dụng;
- phân biệt nội dung giữ nguyên, bổ sung, thay thế, di chuyển và bãi bỏ;
- hiển thị thao tác không áp dụng được hoặc xung đột còn mở;
- không cho chỉnh sửa độc lập theo cách làm mất truy nguyên.

Người dùng muốn sửa projection phải quay về thao tác nguồn hoặc nội dung dự thảo sửa đổi. `ConsolidatedProjection` không được đổi trạng thái trực tiếp thành văn bản hợp nhất chính thức.

Văn bản hợp nhất chính thức là một `LegalDocument` riêng, có cơ quan, số ký hiệu, ngày, nguồn và thẩm quyền. Projection có thể hỗ trợ chuẩn bị dữ liệu, nhưng phải qua quy trình kiểm chứng và tạo đối tượng chính thức riêng; không kế thừa mặc nhiên trạng thái pháp lý từ projection.

## 8. Đầu ra có thể sinh tự động

Từ dự thảo có cấu trúc và danh sách thao tác, hệ thống hỗ trợ sinh:

- dự thảo văn bản sửa đổi theo mẫu và RuleSet đã được phê duyệt;
- bản so sánh, thuyết minh giữa nội dung nguồn và nội dung dự kiến;
- danh sách nút/nội dung bị tác động;
- bản dự kiến nội dung sau sửa đổi;
- danh sách tham chiếu nội bộ và tham chiếu liên quan có nguy cơ bị ảnh hưởng.

Các đầu ra phải ghi phiên bản nguồn, `DraftVersion`, phiên bản RuleSet, thời điểm sinh và trạng thái kiểm tra. Hệ thống có thể tự động loại bỏ lỗi cấu trúc, đánh số và phần lớn lỗi thể thức đã được mô hình hóa, nhưng không thay thế việc kiểm tra pháp lý và chuyên môn.

## 9. Nội dung cần người dùng hoặc chuyên gia xác nhận

- Nguồn chính thức, tiêu chí kiểm chứng và bằng chứng cần lưu cho từng loại nguồn văn bản gốc.
- Thẩm quyền pháp lý cụ thể của vai trò duyệt nghiệp vụ và duyệt phát hành theo từng hồ sơ.
- Quy tắc thứ tự giữa các thao tác cùng tác động một vùng nội dung.
- Mức chặn/cảnh báo cho tham chiếu bị ảnh hưởng.
- Quy trình, metadata và nguồn chính thức để tạo `LegalDocument` hợp nhất.
- Mẫu bản so sánh, thuyết minh cho từng loại văn bản.

# Bộ quy tắc cấu trúc và đánh số

## 1. Mục đích

`LegalStructureRuleSet` là bộ quy tắc có phiên bản dùng để kiểm tra [mô hình nội dung pháp lý có cấu trúc](mo-hinh-noi-dung-phap-ly-co-cau-truc.md), điều khiển thao tác trong [Structured Legal Editor](../06-thiet-ke-giao-dien/thiet-ke-structured-legal-editor.md), và hỗ trợ sinh đầu ra. Tài liệu này không xác lập quy tắc thể thức pháp lý hiện hành; cấu hình cụ thể chỉ được công bố sau khi căn cứ và nội dung đã được chuyên gia có thẩm quyền kiểm chứng.

Phiên bản 1 ưu tiên RuleSet cho Thông tư mới và Thông tư sửa đổi, bổ sung. Kiến trúc cho phép bổ sung RuleSet Nghị định, nhưng chưa triển khai đầy đủ quy tắc Nghị định trong phiên bản 1.

## 2. Thông tin nhận diện và hiệu lực

| Thuộc tính | Ý nghĩa |
| --- | --- |
| Tên bộ quy tắc | Tên dễ nhận biết, không thay thế mã phiên bản |
| Loại văn bản áp dụng | Danh mục loại `LegalDocument` mà bộ quy tắc được phép gán |
| Cơ quan/phạm vi áp dụng | Cơ quan, đơn vị, quy trình hoặc phạm vi nghiệp vụ được phê duyệt |
| Căn cứ pháp lý | Nguồn, số ký hiệu, ngày ban hành, tình trạng hiệu lực và điều khoản liên quan |
| Ngày hiệu lực | Ngày phiên bản cấu hình bắt đầu được phép áp dụng |
| Ngày hết hiệu lực | Ngày ngừng gán mới, nếu có |
| Trạng thái | Dự thảo, đang áp dụng hoặc hết hiệu lực |
| Phiên bản | Mã phiên bản bất biến và quan hệ với phiên bản trước |
| Người phê duyệt cấu hình | Chủ thể có thẩm quyền cùng thời điểm và căn cứ phê duyệt |

Ngày hiệu lực của RuleSet là hiệu lực sử dụng cấu hình trong hệ thống, không tự đồng nhất với hiệu lực pháp lý của văn bản căn cứ. Hai trạng thái phải được quản lý và kiểm chứng riêng.

## 3. Nhóm quy tắc

| Nhóm | Nội dung cấu hình | Ví dụ năng lực, không phải quy định hiện hành |
| --- | --- | --- |
| Loại nút được phép | Loại `LegalNode` cho từng loại văn bản/ngữ cảnh | Cho phép hoặc không cho phép nhóm Phần mở đầu, Tiểu mục, Chú thích; Phần mở đầu không phải cấp Phần nằm trên Chương |
| Quan hệ cha-con | Ma trận loại con hợp lệ và số lượng | Điều được đặt trong Chương hoặc vị trí khác đã xác nhận |
| Thứ tự | Trật tự loại nút và nút cùng cấp | Khối mở đầu đứng trước nội dung quy định |
| Đánh số | Chuỗi số, ký hiệu, đặt lại số, nối tiếp số, khóa số | Tính số hiển thị của Điều/Khoản/Điểm |
| Viết hoa | Kiểu viết hoa theo loại nội dung | Tên loại, tiêu đề hoặc nhãn cấu trúc |
| Dấu câu | Dấu kết thúc, phân cách hoặc mẫu câu | Cảnh báo dấu câu theo loại nút |
| Thụt lề | Mức thụt và căn chỉnh trình bày | Sinh chế độ truyền thống/DOCX/PDF |
| Bắt buộc/tùy chọn | Số lượng tối thiểu, điều kiện xuất hiện | Thành phần bắt buộc theo loại văn bản |
| Tham chiếu | Kiểu đích hợp lệ và cách sinh nhãn | Cập nhật “Điều …” từ ID đích |
| Cảnh báo/lỗi chặn | Mức nghiêm trọng và điều kiện xử lý | Không có nút bắt buộc, tham chiếu bị đứt |
| Ngoại lệ | Trường hợp sai khác được phép và thẩm quyền xác nhận | Khóa số hiển thị hoặc bỏ qua cảnh báo có lý do |
| Trình bày | Ánh xạ cấu trúc sang kiểu hiển thị/mẫu | Khoảng cách, căn lề, nhãn và ngắt trang |

Mỗi quy tắc có mã ổn định, mô tả tiếng Việt, phạm vi, điều kiện, mức nghiêm trọng, thông điệp cho người dùng và nguồn/căn cứ đã kiểm chứng. Không lưu quy tắc quan trọng chỉ dưới dạng mô tả tự do không thể kiểm tra.

## 4. Phân loại kết quả kiểm tra

| Mức | Ý nghĩa | Hành vi |
| --- | --- | --- |
| Lỗi cấu trúc chặn phát hành | Vi phạm bất biến hoặc điều kiện không được phép | Không tạo/phát hành `ReleasePackage` cho đến khi sửa hoặc có cơ chế ngoại lệ hợp lệ nếu RuleSet cho phép |
| Cảnh báo cần xác nhận | Có nguy cơ hoặc ngoại lệ cần con người đánh giá | Yêu cầu người có quyền xác nhận, ghi lý do và nhật ký |
| Gợi ý biên tập | Khuyến nghị về tính nhất quán hoặc dễ đọc | Người dùng có thể áp dụng hoặc bỏ qua; không tự đổi nội dung |
| Kiểm tra cần chuyên gia pháp lý | Vấn đề nội dung, thẩm quyền, hiệu lực hoặc giải thích pháp luật | Chuyển cho chuyên gia; hệ thống không tự kết luận |

Mức của từng quy tắc phải được phê duyệt trong phiên bản RuleSet. AI không được tự nâng/hạ mức, tự xác nhận cảnh báo hoặc xử lý kiểm tra pháp lý.

## 5. Đánh số và tham chiếu

- Số hiển thị được tính từ loại nút, vị trí, ngữ cảnh và quy tắc áp dụng.
- Người soạn không nhập trực tiếp số Điều, Khoản hoặc Điểm.
- ID nút không đổi khi đánh lại số.
- Tham chiếu nội bộ trỏ ID và sinh nhãn hiển thị sau khi đánh số.
- Số đặc biệt hoặc số giữ nguyên từ văn bản cũ chỉ được dùng khi nhập nguồn hoặc theo ngoại lệ RuleSet đã phê duyệt.
- Ngoại lệ phải có lý do, người phê duyệt và `AuditEvent`.
- Di chuyển, bổ sung, tách, hợp nhất hoặc bãi bỏ nút kích hoạt đánh giá lại số và tham chiếu bị ảnh hưởng.
- Không cho người dùng nhập trực tiếp số như một phần của nội dung nếu số đó do RuleSet quản lý.

**Cần chuyên gia pháp lý xác nhận:** thuật toán đánh số, trường hợp đánh lại/giữ số, dạng số bổ sung và cách xử lý tham chiếu cho từng loại văn bản.

RuleSet và mẫu xuất quyết định font, cỡ chữ, màu, căn lề, thụt lề, khoảng cách và cách hiển thị số cấu trúc. Người soạn không được đưa các lựa chọn trình bày này vào nội dung nguồn.

## 6. Phiên bản hóa và gán cho hồ sơ

- Không sửa trực tiếp RuleSet đang áp dụng hoặc đã từng được gán cho hồ sơ.
- Mọi thay đổi tạo phiên bản mới, kể cả thay đổi thông điệp có thể ảnh hưởng quyết định người dùng.
- Hồ sơ và `DraftVersion` cũ giữ tham chiếu RuleSet đã được gán để tái tạo kết quả kiểm tra/trình bày.
- Phiên bản mới không tự áp dụng cho hồ sơ đang thực hiện.
- Chuyển RuleSet của hồ sơ phải có quyết định, người thực hiện, so sánh kết quả trước/sau và `AuditEvent`.
- RuleSet hết hiệu lực không được gán mới nhưng vẫn được lưu để đọc và tái tạo lịch sử.

Nếu một hồ sơ cần đồng thời nhiều tập quy tắc, phải xác định rõ vai trò và thứ tự ưu tiên; không để hai quy tắc xung đột được áp dụng âm thầm.

## 7. Quy trình thử nghiệm và phê duyệt

1. **Soạn cấu hình:** quản trị nghiệp vụ tạo hoặc đề xuất phiên bản dự thảo và liên kết căn cứ.
2. **Kiểm chứng pháp lý:** chuyên viên pháp chế xác nhận nguồn, hiệu lực, điều khoản và cách chuyển thành quy tắc.
3. **Thử nghiệm:** chạy bộ tình huống hợp lệ, không hợp lệ, ngoại lệ và hồi quy trên dữ liệu giả lập.
4. **Đối chiếu đầu ra:** kiểm tra cây, số, tham chiếu, trình bày truyền thống, DOCX và PDF mẫu.
5. **Phê duyệt và công bố:** người có thẩm quyền chấp thuận phiên bản, ngày hiệu lực, phạm vi và quyết định công bố; hệ thống chỉ thực hiện chuyển trạng thái theo quyết định và ghi `AuditEvent`.
6. **Phân tách trách nhiệm:** không cho cùng một người tự tạo, tự kiểm chứng và tự công bố nếu quy trình áp dụng yêu cầu phân tách trách nhiệm.
7. **Theo dõi:** ghi lỗi, ngoại lệ và nhu cầu sửa vào phiên bản kế tiếp.

AI có thể gợi ý kiểm thử hoặc phát hiện khác biệt nhưng không được tự công bố RuleSet, phê duyệt cấu hình hoặc xác nhận căn cứ pháp lý.

## 8. Điều chỉnh thủ công và ngoại lệ

Mọi điều chỉnh thủ công đối với kết quả RuleSet phải ghi quy tắc bị tác động, đối tượng, giá trị trước/sau, lý do, người thực hiện, người phê duyệt nếu cần và thời điểm. Điều chỉnh không làm thay đổi RuleSet gốc.

Ngoại lệ phải thuộc loại đã được RuleSet cho phép. Nếu ngoại lệ chưa được mô hình hóa, người dùng không được âm thầm bỏ qua lỗi chặn; yêu cầu phải chuyển về chủ sở hữu nghiệp vụ để đánh giá phiên bản quy tắc mới.

## 9. Bất biến

- Mỗi kết quả kiểm tra truy được về đúng phiên bản RuleSet và mã quy tắc.
- Một phiên bản RuleSet đã công bố là bất biến.
- Khoảng áp dụng, trạng thái và người phê duyệt luôn xác định.
- Căn cứ chưa kiểm chứng không được dùng để công bố RuleSet đang áp dụng.
- Cấu trúc có lỗi chặn chưa xử lý không được phát hành.
- Điều chỉnh thủ công và chuyển phiên bản luôn có nhật ký.
- RuleSet không trở thành nguồn nội dung văn bản; nó chỉ kiểm tra, tính toán và trình bày dữ liệu cấu trúc.

## 10. Nội dung cần người dùng hoặc chuyên gia xác nhận

- Nguồn căn cứ chính thức và chu kỳ rà soát hiệu lực.
- Nội dung pháp lý cụ thể của RuleSet Thông tư mới và Thông tư sửa đổi, bổ sung.
- Mức nghiêm trọng và thẩm quyền xác nhận từng cảnh báo/ngoại lệ.
- Bộ ca kiểm thử chuẩn và tiêu chí chấp nhận.
- Chính sách chuyển RuleSet cho hồ sơ đang thực hiện.
- RuleSet Nghị định khi triển khai sau phiên bản 1.

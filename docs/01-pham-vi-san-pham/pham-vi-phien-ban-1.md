# Phạm vi sản phẩm - phiên bản 1

## 1. Vị trí của tài liệu

Tài liệu xác định ranh giới nghiệp vụ của phiên bản đầu tiên. Mô hình vận hành chi tiết được mô tả tại [Mô hình nghiệp vụ tổng thể](../03-phan-tich-nghiep-vu/mo-hinh-nghiep-vu-tong-the.md), nguyên tắc cấu hình quy trình tại [Nguyên tắc workflow](../04-thiet-ke-quy-trinh/nguyen-tac-workflow.md), và khái niệm dữ liệu tại [Từ điển thực thể nghiệp vụ](../05-mo-hinh-du-lieu/tu-dien-thuc-the-nghiep-vu.md).

## 2. Mục tiêu sản phẩm

Hệ thống hỗ trợ cơ quan chủ trì quản lý có cấu trúc quá trình xây dựng văn bản quy phạm pháp luật mới hoặc sửa đổi, bổ sung văn bản hiện hành. Sản phẩm hướng tới:

- tập trung hồ sơ, dự thảo, ý kiến, kết luận, chỉ đạo và căn cứ thay đổi;
- kiểm soát nghĩa vụ, cổng kiểm soát và thành phần hồ sơ theo quy trình được cấu hình;
- duy trì lịch sử phiên bản và khả năng truy nguyên từ nội dung thay đổi đến căn cứ phát sinh;
- hỗ trợ soạn thảo có cấu trúc và sinh tài liệu trình bày nhất quán;
- tự động loại bỏ lỗi cấu trúc, đánh số và phần lớn lỗi thể thức có thể biểu diễn thành quy tắc đã được xác nhận.

Hệ thống không thay thế trách nhiệm chuyên môn, pháp lý hoặc thẩm quyền quyết định của cá nhân và cơ quan có thẩm quyền.

## 3. Đối tượng sử dụng

- Thành viên Tổ soạn thảo và bộ phận chủ trì soạn thảo.
- Chuyên viên nghiệp vụ, chuyên viên pháp chế và đầu mối tổng hợp.
- Lãnh đạo đơn vị, lãnh đạo cơ quan và người có thẩm quyền xem xét, chỉ đạo hoặc phê duyệt.
- Đơn vị phối hợp góp ý, thẩm định hoặc theo dõi tiến độ trong phạm vi được phân quyền.
- Quản trị viên cấu hình quy trình, mẫu biểu, quy tắc thể thức và danh mục dùng chung.
- Kiểm soát viên hoặc cán bộ kiểm tra lịch sử xử lý, với quyền chỉ đọc phù hợp.

Vai trò cụ thể và thẩm quyền của từng nhóm phải được cơ quan chuyên môn xác nhận trước khi cấu hình vận hành.

## 4. Phạm vi loại công việc

### 4.1. Xây dựng văn bản mới

Quản lý một hồ sơ từ khởi tạo, phân công, soạn thảo, lấy ý kiến, chỉnh lý, thẩm định, trình, phê duyệt đến phát hành theo quy trình áp dụng. Thành phần hồ sơ và cổng kiểm soát phụ thuộc loại văn bản, cơ quan tham gia và trình tự áp dụng.

### 4.2. Sửa đổi, bổ sung văn bản hiện hành

Quản lý văn bản nền, phạm vi điều khoản dự kiến thay đổi, lý do thay đổi, phương án sửa đổi, bảng so sánh và mối liên hệ giữa từng thay đổi với căn cứ phát sinh. Phiên bản đầu hỗ trợ quản lý nghiệp vụ sửa đổi, bổ sung nhưng không mặc nhiên xác định tình trạng hiệu lực của văn bản nền.

**Cần cơ quan chuyên môn xác nhận:** danh mục loại văn bản được đưa vào vận hành đầu tiên, thẩm quyền tương ứng, quy tắc hợp nhất văn bản và nguồn dữ liệu chính thức dùng để kiểm tra hiệu lực.

## 5. Phạm vi phiên bản đầu tiên

Phiên bản đầu quản lý danh mục nhiều hồ sơ, cho phép người có quyền đổi tên, mô tả và trạng thái vòng đời mà không xóa lịch sử. Trang chủ hệ thống tổng hợp danh mục dự án; số liệu chi tiết thuộc tổng quan từng hồ sơ.

Nguồn tài liệu nhập vào hệ thống giới hạn ở `.docx`. Việc chuyển đổi PDF hoặc định dạng khác sang DOCX được thực hiện độc lập ngoài hệ thống. Hệ thống lưu DOCX nguyên bản, checksum và thông tin nguồn, sau đó bóc tách cấu trúc để người dùng kiểm chứng; không mặc nhiên coi DOCX hoặc kết quả bóc tách là chính xác pháp lý.

- Quản lý hồ sơ xây dựng văn bản, người tham gia, vai trò và trạng thái.
- Gán một phiên bản quy trình cho hồ sơ và theo dõi các bước, cổng kiểm soát, đầu vào, đầu ra.
- Quản lý không giới hạn đợt góp ý, họp, chỉ đạo, chỉnh lý, trình và thẩm định trong phạm vi lưu trữ cho phép.
- Quản lý không gian biên tập theo nhánh, mốc khôi phục, phiên bản dự thảo bất biến, nhánh dự thảo song song, hợp nhất và bản phát hành bị khóa.
- Ghi nhận ý kiến, phương án tiếp thu/không tiếp thu, người quyết định và căn cứ.
- Soạn nội dung bằng Structured Legal Editor và kiểm tra các quy tắc cấu trúc, đánh số, thể thức đã được cấu hình.
- Sinh chế độ trình bày truyền thống, DOCX và PDF từ dữ liệu cấu trúc.
- Quản lý gói hồ sơ trình hoặc lấy ý kiến, tài liệu được sinh, dấu vết phát hành và nhật ký kiểm toán.
- Quản lý người, tổ chức, vai trò, thành viên hồ sơ và ủy quyền có phạm vi; chi tiết quản lý định danh và truy cập (IAM) được thiết kế ở giai đoạn sau.
- Tìm kiếm, báo cáo tiến độ và xem lịch sử truy nguyên theo quyền truy cập.
- Cấu hình quy trình, mẫu biểu và căn cứ pháp lý theo phiên bản, sau khi được người có thẩm quyền xác nhận.

## 6. Chức năng chưa thực hiện ở phiên bản đầu

- Không OCR, nhận dạng bố cục hoặc bóc tách hàng loạt PDF nặng trên NAS.
- Không tự động nhập chính xác nội dung pháp lý từ tài liệu ảnh hoặc PDF không có cấu trúc.
- Không tự kết luận hiệu lực, xung đột hoặc tính hợp pháp của căn cứ pháp lý.
- Không tự động phê duyệt, tự tiếp thu ý kiến hoặc tự ghi đè dự thảo chính.
- Không thay thế hệ thống quản lý văn bản, chữ ký số hoặc cổng thông tin của cơ quan; tích hợp chỉ được xem xét sau khi xác định giao diện và thẩm quyền.
- Không cung cấp cộng tác thời gian thực phức tạp nếu chưa được ưu tiên và kiểm chứng khả năng vận hành trên NAS.
- Không xử lý văn bản mật hoặc dữ liệu thật trước khi có thiết kế bảo mật, phân loại dữ liệu và nghiệm thu tương ứng.
- Không di chuyển tự động hồ sơ đang thực hiện sang quy trình mới khi chưa có quyết định chuyển đổi.

## 7. Nguyên tắc dữ liệu nội dung và xuất bản

Structured Legal Editor là nguồn dữ liệu nội dung chính. Cấu trúc điều, khoản, điểm, phụ lục, tham chiếu và metadata được lưu dưới dạng dữ liệu có cấu trúc; giao diện trình bày không phải nguồn gốc nội dung độc lập.

DOCX, PDF và chế độ trình bày truyền thống phải được sinh từ cùng dữ liệu cấu trúc và mẫu biểu có phiên bản. Bản đã phát hành được lưu cùng dấu vết phiên bản dữ liệu, mẫu và quy tắc sinh tài liệu để có thể kiểm tra lại. Việc nhập ngược từ DOCX/PDF, nếu được bổ sung sau này, phải qua bước đối chiếu và xác nhận của con người.

Trạng thái đang biên tập và các mốc khôi phục không phải bản phát hành. Chỉ phiên bản dự thảo bất biến mới được đưa vào gói phát hành; một gói có thể chứa nhiều phương án dự thảo cùng tài liệu biểu mẫu, phụ lục hoặc tài liệu tham chiếu được quản lý đúng loại.

## 8. Nguyên tắc vận hành không phụ thuộc AI

Toàn bộ luồng cốt lõi phải sử dụng được khi mô-đun AI bị tắt, mất kết nối hoặc không được cấp quyền. Người dùng vẫn có thể soạn thảo, góp ý, tiếp thu, quản lý quy trình, sinh tài liệu và phê duyệt bằng thao tác thủ công.

AI chỉ tạo đề xuất có gắn nguồn và mức độ tin cậy khi phù hợp. Con người có thẩm quyền phải xem xét và quyết định chấp nhận, sửa hoặc từ chối. Mọi nội dung do AI đề xuất phải phân biệt được với nội dung đã được con người xác nhận; AI không được tự phê duyệt, tự tiếp thu hoặc ghi đè dự thảo chính.

## 9. Giới hạn xử lý trên NAS

NAS phục vụ ứng dụng và dữ liệu nghiệp vụ trong năng lực tài nguyên được phê duyệt. Các tác vụ OCR, bóc tách PDF nặng, huấn luyện mô hình hoặc xử lý tài liệu hàng loạt không thuộc phạm vi phiên bản đầu và không chạy trực tiếp trên NAS. Nếu phát sinh nhu cầu, phải có thiết kế dịch vụ tách biệt, đánh giá bảo mật, giới hạn tài nguyên và cơ chế đưa kết quả về để con người xác nhận.

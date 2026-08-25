# Nguyên tắc workflow

## 1. Vai trò của workflow

Workflow chỉ quản lý nghĩa vụ nghiệp vụ, cổng kiểm soát, thành phần hồ sơ và điều kiện chuyển giai đoạn. Workflow không giới hạn số lượng bản làm việc, phiên bản dự thảo, nhánh phương án hay đợt xử lý.

Hai trục workflow và dự thảo phải độc lập theo [Mô hình nghiệp vụ tổng thể](../03-phan-tich-nghiep-vu/mo-hinh-nghiep-vu-tong-the.md). Các khái niệm dữ liệu liên quan được định nghĩa tại [Từ điển thực thể nghiệp vụ](../05-mo-hinh-du-lieu/tu-dien-thuc-the-nghiep-vu.md).

## 2. Phiên bản và hiệu lực của quy trình

- Mỗi định nghĩa quy trình có một hoặc nhiều phiên bản; mỗi phiên bản có ngày bắt đầu hiệu lực, ngày hết hiệu lực nếu có, trạng thái và căn cứ phê duyệt.
- Phiên bản chỉ được đưa vào sử dụng khi căn cứ pháp lý, thẩm quyền phê duyệt và cấu hình đã được xác nhận.
- Hồ sơ đang thực hiện giữ nguyên phiên bản quy trình đã được gán, kể cả khi có phiên bản mới, trừ khi có quyết định chuyển đổi.
- Chuyển đổi phải ghi quyết định, người có thẩm quyền, thời điểm, ánh xạ bước cũ/mới, nghĩa vụ đã hoàn thành và ngoại lệ được chấp thuận.
- Không sửa tại chỗ phiên bản đã có hồ sơ sử dụng; thay đổi tạo phiên bản mới.

## 3. Điều kiện và khả năng điều hướng

Bước có thể được bật, bỏ qua có kiểm soát hoặc thay đổi yêu cầu theo:

- loại văn bản;
- trình tự thông thường hoặc rút gọn;
- vai trò của Cục/cơ quan là cơ quan soạn thảo, cơ quan trình hoặc đơn vị phối hợp;
- việc văn bản có quy định thủ tục hành chính;
- nội dung phân cấp nhiệm vụ, quyền hạn;
- yêu cầu đánh giá tác động;
- các đặc điểm khác đã có căn cứ và được cơ quan chuyên môn xác nhận.

Một bước có thể lặp lại không giới hạn về mặt nghiệp vụ. Hồ sơ có thể quay lại bước trước với lý do và quyết định được ghi nhận. Các hoạt động có thể chạy song song khi không phụ thuộc đầu ra của nhau; cổng hợp nhất phải xác định đủ kết quả nào cần có trước khi tiếp tục.

Mỗi lần bước được kích hoạt phải được quản lý bằng một `WorkflowStageInstance` riêng, bao gồm thời điểm bắt đầu/kết thúc, trạng thái, người phụ trách, kết quả cổng và nguyên nhân quay lại. Nhiều instance của cùng một bước có thể xuất hiện nối tiếp hoặc song song. Mỗi instance có thể không có, có một hoặc có nhiều `ReviewRound`; đợt xử lý không thay thế lần thực thi bước.

## 4. Đầu vào, đầu ra và căn cứ pháp lý

Thành phần hồ sơ đầu vào và đầu ra của mỗi bước được cấu hình theo phiên bản, gồm loại tài liệu, trạng thái, chủ thể ký/xác nhận, hình thức, số lượng và điều kiện bắt buộc. Hệ thống không lập trình cứng danh sách tài liệu từ một tài liệu tham chiếu.

Gói phát hành chỉ sử dụng `DraftVersion` bất biến, không lấy trực tiếp trạng thái đang biên tập hoặc checkpoint. Một gói có thể chứa nhiều phiên bản để xin lựa chọn phương án, cùng biểu mẫu, phụ lục và tài liệu tham chiếu được phân loại riêng. Thay đổi thành phần sau phát hành luôn tạo gói mới.

Căn cứ pháp lý của bước phải ghi nguồn, số ký hiệu, ngày ban hành, tình trạng hiệu lực, điều khoản liên quan và thời gian áp dụng. Khi căn cứ hết hiệu lực hoặc thay đổi, phiên bản quy trình cũ vẫn được bảo toàn; phiên bản mới chỉ có hiệu lực sau khi được thẩm tra và phê duyệt cấu hình.

## 5. Cổng kiểm soát chính

### 5.1. Trước khi trình Bộ

Cổng kiểm tra tối thiểu: loại văn bản và trình tự đã được xác định; nghĩa vụ cấp Cục đã hoàn thành hoặc có quyết định miễn/không áp dụng; phiên bản dự thảo được chốt; ý kiến và kết quả tiếp thu được liên kết; thành phần hồ sơ đủ theo cấu hình; gói trình được người có thẩm quyền xác nhận.

### 5.2. Trước khi thẩm định

Cổng kiểm tra tối thiểu: đúng cơ quan thẩm định theo loại văn bản; kết quả lấy ý kiến và xử lý ý kiến đã đủ; bản phát hành thẩm định bị khóa; tài liệu về thủ tục hành chính, phân cấp, đánh giá tác động hoặc rà soát liên quan được yêu cầu đúng điều kiện; ngoại lệ có phê duyệt.

### 5.3. Trước khi trình ký

Cổng kiểm tra tối thiểu: kết quả thẩm định đã được tiếp thu/giải trình; các ý kiến khác nhau còn tồn tại đã được xử lý theo thẩm quyền; dự thảo cuối và gói trình được khóa; các phê duyệt nội bộ, căn cứ và thành phần hồ sơ đáp ứng phiên bản quy trình.

Danh sách trên là nguyên tắc thiết kế, không phải kết luận về thành phần hồ sơ pháp lý hiện hành. **Cần cơ quan chuyên môn xác nhận** điều kiện chi tiết cho từng loại văn bản.

## 6. Phân tích tài liệu tham chiếu tháng 10/2025

### 6.1. Giới hạn sử dụng

Tài liệu `private-data/input/Quy trình Cục.pdf` được lập tháng 10/2025 và được dùng để phát hiện nhánh, bước, đầu vào/đầu ra và điểm biến thiên. Không sao chép tài liệu vào Git, không lập trình cứng nội dung của tài liệu, và không coi các căn cứ, thời hạn hoặc thành phần hồ sơ trong đó là quy định hiện hành nếu chưa kiểm chứng.

### 6.2. Năm giai đoạn lớn được nhận diện

1. Thành lập Tổ soạn thảo: có biến thể theo loại văn bản và vai trò cơ quan.
2. Soạn thảo và trình Bộ: gồm hoạt động soạn, lấy ý kiến nội bộ/đối tượng liên quan, họp/chỉ đạo, chỉnh lý, chuẩn bị hồ sơ và truyền thông chính sách khi áp dụng.
3. Xử lý hồ sơ sau khi trình Bộ: có thể gồm lấy ý kiến trong và ngoài Bộ, đăng tải, tiếp thu, thẩm định nội bộ, báo cáo lãnh đạo và trình ký đối với nhánh tương ứng.
4. Gửi Bộ Tư pháp thẩm định: tài liệu tham chiếu áp dụng cho nhánh Nghị định, gồm gửi hồ sơ, tiếp thu thẩm định, xử lý ý kiến khác nhau và hoàn thiện trước trình Chính phủ.
5. Trình Chính phủ: tài liệu tham chiếu áp dụng cho nhánh Nghị định, gồm phát hành gói trình, tiếp thu ý kiến thành viên và hoàn thiện trình ký.

Đây là cách phân nhóm từ tài liệu tham chiếu, không phải khẳng định năm giai đoạn là cấu trúc pháp lý bắt buộc.

### 6.3. Nhánh Thông tư

Nhánh tham chiếu đi qua giai đoạn 1 đến 3, với các điểm đáng chú ý: khả năng thành lập tổ soạn thảo; nhiều vòng xử lý cấp Cục và cấp Bộ; thẩm định tại đơn vị pháp chế của Bộ; tiếp thu kết quả thẩm định; báo cáo lãnh đạo và trình người có thẩm quyền ký ban hành. Điều kiện lấy ý kiến, đăng tải, truyền thông và thành phần hồ sơ khác nhau giữa trình tự thông thường/rút gọn và các đặc tính của văn bản.

**Cần kiểm chứng:** thẩm quyền, tên cơ quan/đơn vị, thành phần hồ sơ, mốc thời gian, nghĩa vụ lấy ý kiến/đăng tải/truyền thông và căn cứ áp dụng hiện hành.

### 6.4. Nhánh Nghị định

Nhánh tham chiếu đi qua cả năm giai đoạn, có thêm hồ sơ trình Chính phủ, thẩm định của Bộ Tư pháp, xử lý ý kiến khác nhau giữa các cơ quan và tiếp thu ý kiến thành viên Chính phủ. Các vòng góp ý, họp và chỉnh lý có thể lặp lại trước và sau thẩm định.

**Cần kiểm chứng:** cơ quan bắt buộc phải lấy ý kiến, thời hạn, thành phần/số lượng/hình thức hồ sơ, thủ tục xử lý ý kiến khác nhau, yêu cầu đánh giá tác động và thẩm quyền phê duyệt từng cổng.

### 6.5. Trình tự thông thường

Mô hình cấu hình cần cho phép đầy đủ các nghĩa vụ lấy ý kiến, đăng tải, truyền thông, thẩm định, tiếp thu và chuẩn bị hồ sơ theo điều kiện. Một số hoạt động có thể song song nhưng phải có cổng tập hợp kết quả trước khi phát hành gói tiếp theo.

### 6.6. Trình tự rút gọn

Trình tự rút gọn là một biến thể có điều kiện, không phải thao tác bỏ tùy ý các bước. Workflow phải ghi căn cứ/quyết định áp dụng rút gọn; cấu hình rõ bước nào không áp dụng, bước nào vẫn bắt buộc, thành phần hồ sơ thay đổi và thời hạn tương ứng.

**Cần cơ quan chuyên môn xác nhận:** điều kiện được áp dụng rút gọn và toàn bộ khác biệt hiện hành cho từng loại văn bản.

### 6.7. Điểm cần cấu hình

- Loại văn bản và vai trò cơ quan chủ trì/soạn thảo/trình.
- Phiên bản quy trình, khoảng hiệu lực và căn cứ pháp lý.
- Trình tự thông thường/rút gọn và quyết định kích hoạt.
- Bước bắt buộc, tùy chọn, có điều kiện, lặp lại hoặc song song.
- Đối tượng lấy ý kiến, thời hạn, kênh và phạm vi tài liệu phát hành.
- Điều kiện đăng tải và truyền thông chính sách.
- Thành phần hồ sơ theo cổng, định dạng, số lượng, yêu cầu ký/xác nhận.
- Điều kiện về thủ tục hành chính, phân cấp, đánh giá tác động và rà soát.
- Cơ quan thẩm định, cấp báo cáo, cấp phê duyệt và quyền trả lại.
- Mẫu biểu, quy tắc thể thức và tài liệu sinh tự động.
- Quy tắc khóa bản phát hành, vai trò từng mục/phương án trong gói, xử lý ngoại lệ và chuyển đổi phiên bản workflow.

### 6.8. Nội dung phải kiểm chứng theo quy định hiện hành

- Hiệu lực và nội dung áp dụng của mọi luật, nghị định, quyết định, quy chế và quy định được PDF viện dẫn.
- Tên, chức năng, thẩm quyền và cơ cấu hiện hành của các cơ quan/đơn vị.
- Nghĩa vụ thành lập tổ soạn thảo và thành phần có thẩm quyền.
- Đối tượng, hình thức và thời hạn lấy ý kiến, đăng tải, truyền thông.
- Thành phần, biểu mẫu, số lượng, hình thức ký/đóng dấu và kênh gửi của từng gói hồ sơ.
- Điều kiện và thủ tục áp dụng trình tự rút gọn.
- Yêu cầu liên quan đến thủ tục hành chính, phân cấp, đánh giá tác động, rà soát văn bản và điều ước quốc tế.
- Thời hạn, cơ quan và phạm vi thẩm định; quy trình tiếp thu sau thẩm định.
- Cổng xin ý kiến tổ chức Đảng, báo cáo lãnh đạo, trình ký và phát hành.
- Các bước mà chính tài liệu tham chiếu ghi nhận là thông lệ nhưng không nêu căn cứ cụ thể.

## 7. Nguyên tắc cấu hình và kiểm soát thay đổi

Mọi cấu hình workflow phải có chủ sở hữu nghiệp vụ, người kiểm tra pháp lý, người phê duyệt, ngày hiệu lực và lịch sử thay đổi. AI có thể hỗ trợ phát hiện khác biệt hoặc gợi ý cấu hình nhưng không được kích hoạt phiên bản quy trình hay quyết định ngoại lệ.

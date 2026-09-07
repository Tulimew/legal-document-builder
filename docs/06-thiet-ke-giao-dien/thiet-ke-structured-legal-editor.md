# Thiết kế Structured Legal Editor

## 1. Mục đích và nguyên tắc trải nghiệm

Structured Legal Editor là giao diện nghiệp vụ để soạn và kiểm soát [nội dung pháp lý có cấu trúc](../05-mo-hinh-du-lieu/mo-hinh-noi-dung-phap-ly-co-cau-truc.md), thực hiện [thao tác sửa đổi văn bản](../05-mo-hinh-du-lieu/mo-hinh-thao-tac-sua-doi-van-ban.md), và hiển thị kết quả của [LegalStructureRuleSet](../05-mo-hinh-du-lieu/bo-quy-tac-cau-truc-va-danh-so.md). Tài liệu mô tả bố cục và hành vi nghiệp vụ, chưa phải thiết kế đồ họa chi tiết.

Editor phải hoạt động đầy đủ khi không có AI. AI chỉ xuất hiện như trợ lý tùy chọn, mọi đề xuất phải được con người xem xét và không được tự áp dụng vào `DraftWorkspace` hoặc dự thảo chính.

Phiên bản 1 ưu tiên soạn Thông tư mới và Thông tư sửa đổi, bổ sung. Giao diện giữ khả năng mở rộng cho Nghị định nhưng không hiển thị như thể đã có đầy đủ RuleSet Nghị định.

## 2. Bố cục tổng thể

### 2.1. Thanh trên

| Thành phần | Nội dung/hành vi |
| --- | --- |
| Tên hồ sơ | Hiển thị tên và mã hồ sơ, mở thông tin hồ sơ theo quyền |
| Phiên bản dự thảo | Phiên bản gần nhất/đang so sánh; không gọi tự động lưu là phiên bản |
| Nhánh | Nhánh hiện hành và thao tác chuyển nhánh có kiểm soát |
| Trạng thái lưu | Đang lưu, đã đồng bộ, chưa đồng bộ hoặc lỗi đồng bộ |
| RuleSet áp dụng | Tên, phiên bản, trạng thái hiệu lực cấu hình và liên kết xem chi tiết |
| Tạo phiên bản | Chốt workspace thành `DraftVersion` bất biến sau khi kiểm tra quyền và lỗi chặn |
| Kiểm tra | Chạy/hiển thị kết quả RuleSet theo mức nghiêm trọng |
| Xem truyền thống | Chuyển sang bản trình bày sinh từ dữ liệu cấu trúc |
| Xuất bản/phát hành | Mở quy trình tạo `ReleasePackage`; không phát hành trực tiếp workspace |

Nút phát hành phải dùng nhãn phù hợp với quyền và giai đoạn, tránh để thao tác kỹ thuật bị hiểu là phê duyệt pháp lý.

### 2.2. Cột trái - Cây cấu trúc

Cây hiển thị ba vùng nghiệp vụ cố định `Phần đầu`, `Phần nội dung`, `Phần cuối`; đây là nhóm thành phần chuyên biệt, không phải cấp “Phần”. Mỗi vùng hiển thị trực tiếp các mục thuộc vùng đó thay vì sắp toàn bộ nút theo một danh sách phẳng. Phần đầu chứa tên văn bản, trích yếu, Quốc hiệu, Tiêu ngữ, cơ quan/tổ chức ban hành, số/ký hiệu, địa danh và thời gian ban hành. Nội dung các mục này được phép sửa nhưng cách trình bày do RuleSet và mẫu xuất đã kiểm chứng quyết định. Phần cuối chứa thông tin người ký, chữ ký, dấu, nơi nhận và chỉ dẫn kỹ thuật được phép.

Khi chọn một vùng hoặc một mục, giao diện chỉ đưa ra các nút thao tác mang tên nghiệp vụ có thể thêm tại vị trí đó, chẳng hạn **Thêm Chương**, **Thêm Mục**, **Thêm Điều**. Không dùng các nhãn kỹ thuật “cấp gốc”, “cấp con”, “cấp cha” trong luồng thao tác chính. Thứ bậc nội dung chi tiết là Chương → Mục → Tiểu mục → Điều → Khoản → Điểm; quan hệ được phép trong từng ngữ cảnh phải lấy từ RuleSet đã gán cho hồ sơ.

Khi chọn một LegalNode, bảng thuộc tính có mục **Căn cứ phát sinh thay đổi**. Người dùng chọn văn bản, phiên bản nguồn và SourceLegalNode, sau đó ghi vai trò và giải thích. Trạng thái kiểm chứng hiển thị cùng liên kết. Chức năng này độc lập với giao diện tạo `AmendmentOperation` đối với văn bản bị sửa đổi.

Màn hình **Kho văn bản dự án** phân loại văn bản bị sửa đổi, văn bản làm căn cứ và văn bản liên quan; chỉ nhận DOCX. Luồng gồm đăng ký nhận dạng → lưu DOCX/checksum → bóc tách → hiệu chỉnh → kiểm chứng. Nhập thủ công luôn khả dụng khi AI không có.

Kết quả bóc tách giữ bảng dưới dạng hàng và ô để người dùng kiểm chứng. Sau khi tạo hồ sơ, hệ thống dẫn tới Kho văn bản dự án nhằm nhập các văn bản liên quan; với hồ sơ sửa đổi, người dùng phải đưa phiên bản văn bản gốc đã kiểm chứng vào phạm vi sửa đổi trước khi ánh xạ nội dung.

- Hiển thị cây `LegalNode`, ID hỗ trợ kỹ thuật khi cần và số/tên hiển thị được tính.
- Cho phép thêm Chương, Mục, Tiểu mục, Điều, Khoản, Điểm và loại nút khác thuộc cây phiên bản 1 khi RuleSet cho phép trong ngữ cảnh. Phần mở đầu được quản lý như nhóm thành phần chuyên biệt của đầu văn bản, không phải cấp cấu trúc Phần nằm trên Chương.
- Tìm kiếm theo nội dung, số hiển thị, ID hoặc thuật ngữ.
- Lọc nút có góp ý, cảnh báo, lỗi, chỉ đạo, thay đổi chưa chốt hoặc xung đột sửa đổi.
- Kéo thả có kiểm soát: hiển thị vị trí hợp lệ, xem trước ảnh hưởng đánh số/tham chiếu và từ chối cấu trúc sai.
- Hỗ trợ mở/thu gọn cấp, điều hướng bằng bàn phím và ghi nhớ vị trí làm việc.

### 2.3. Khu vực trung tâm - Soạn nội dung

- Hiển thị breadcrumb cấu trúc bằng nhãn được tính từ cây.
- Soạn nội dung của nút đang chọn với tập định dạng hạn chế.
- Hiển thị nội dung trước/sau hoặc thay đổi nội tuyến khi so sánh.
- Đánh dấu thay đổi và mở căn cứ truy nguyên tương ứng.
- Chèn tham chiếu nội bộ bằng tìm/chọn nút đích; lưu ID thay vì chuỗi số.
- Chuyển rõ giữa chế độ văn bản mới và chế độ sửa đổi.
- Trong chế độ sửa đổi, hiển thị phiên bản nguồn, thao tác sửa đổi, nội dung trước, nội dung đề xuất và projection sau sửa đổi.
- Không cho HTML tùy ý hoặc nội dung kết xuất trở thành nguồn dữ liệu chính.
- Thanh định dạng chỉ cho phép đậm, nghiêng, gạch chân, chỉ số trên, chỉ số dưới, tham chiếu nội bộ và chú thích khi RuleSet cho phép. Không cung cấp lựa chọn font, cỡ chữ, màu, căn lề, thụt lề, khoảng cách hoặc số thứ tự cấu trúc.

Trong chế độ so sánh, mọi thay đổi hiển thị phải truy nguyên được. Giao diện phải phân biệt người trực tiếp chỉnh sửa với người phê duyệt, đồng thời hiển thị lý do và căn cứ phát sinh thay đổi. Không chỉ hiển thị khác biệt ký tự mà thiếu ngữ cảnh nghiệp vụ. Nếu chưa xác định được nguồn thay đổi, giao diện phải cảnh báo rõ **“Chưa xác định căn cứ thay đổi”** và không được khiến người dùng hiểu rằng thay đổi đã đủ điều kiện phê duyệt.

Chế độ So sánh mặc định dùng bố cục toàn văn bản theo hướng **document-first**: văn bản được trình bày liên tục và thay đổi được đánh dấu ngay trong mạch đọc. Không tách toàn bộ văn bản thành danh sách thẻ “nội dung trước/nội dung sau”. Thông tin truy nguyên đầy đủ nằm trong bảng phụ có thể mở, thu gọn, đóng và mở lại. Hover hoặc focus chỉ cung cấp tóm tắt; click, phím Enter hoặc phím cách chọn thay đổi và mở thông tin đầy đủ. Trên thiết bị không có hover, người dùng dùng thao tác nhấn. Không đặt thông tin thiết yếu chỉ trong tooltip. Chế độ “Danh sách thay đổi” có thể được bổ sung như cách xem phụ sau này, nhưng không phải giao diện mặc định.

So sánh xa cho phép chọn hai phiên bản bất kỳ trong cùng hồ sơ. Giao diện phân biệt **Thay đổi ròng**, **Diễn biến qua phiên bản** và **Theo từng bước**. Thanh chọn hiển thị đường phiên bản, các mốc trung gian và cảnh báo khi không có quan hệ tổ tiên-hậu duệ trực tiếp. Với rẽ nhánh/hợp nhất, người dùng chọn đường hoặc xem đường hệ thống xác định cùng nguồn hợp nhất; không tự giả định tuyến tính.

Người dùng chọn thêm **Theo cấu trúc phiên bản mới**, **Theo cấu trúc phiên bản gốc** hoặc **Ánh xạ cấu trúc**. Ánh xạ dựa trên ID ổn định, phân biệt `DRAFT_RENUMBER`, `DRAFT_MOVE`, `DRAFT_CONTENT_CHANGE` và `DRAFT_MOVE_AND_CONTENT_CHANGE`; đây là lịch sử phát triển dự thảo, không phải `AmendmentOperation` đối với văn bản gốc. Bảng ánh xạ hiển thị vị trí đầu-cuối, ID, loại biến động, chỉ báo đổi nội dung, phiên bản phát sinh, lý do và căn cứ; có bộ lọc riêng cho đánh lại số và chuyển vị trí.

Trong cấu trúc phiên bản mới, nội dung đầy đủ chỉ nằm ở vị trí hiện tại; không lặp toàn văn tại vị trí cũ và không trình bày như bãi bỏ–bổ sung. Marker nhẹ ngoài lề ghi số tại phiên bản gốc, có thể ẩn, và mở timeline số/vị trí qua mọi phiên bản trung gian. `DRAFT_MOVE_AND_CONTENT_CHANGE` hiển thị chuyển vị trí trong bảng truy nguyên và `ins`/`del` cho nội dung; hai khía cạnh không bị gộp mơ hồ. `DRAFT_RENUMBER` do RuleSet ghi “Đánh lại số tự động”, không tính là thay đổi nội dung. **Bản hoàn thiện** chỉ giữ vị trí và nội dung cuối, không hiển thị marker hoặc dấu vết vị trí cũ.

Timeline bên phải hiển thị trạng thái của `LegalNode` tại từng mốc, kể cả “Không thay đổi”, nội dung đã xuất hiện rồi bị bãi bỏ và các lần sửa tiếp/khôi phục. Có thể lọc theo phiên bản phát sinh, người sửa, nguồn và trạng thái; checkbox cho phép hiện thay đổi trung gian không còn ở bản cuối. Các thay đổi trung gian chỉ nằm trong bảng lịch sử, không chen vào toàn văn phiên bản cuối.

### 2.4. Cột phải - Ngữ cảnh và kiểm soát

Cột phải dùng tab hoặc nhóm có thể thu gọn:

| Nhóm | Nội dung |
| --- | --- |
| Thuộc tính nút | Loại, ID, metadata, trạng thái số, quan hệ cha-con và thuộc tính riêng |
| Ý kiến góp ý | `Comment`, trạng thái và `CommentResolution` liên quan |
| Kết luận/chỉ đạo | `Meeting`, `DirectionDocument`, `DirectionTask`; tách biệt với góp ý |
| Căn cứ thay đổi | `LegalChange`, lý do, người đề xuất/quyết định và nguồn phát sinh |
| Lịch sử | Thay đổi, checkpoint, phiên bản và `AuditEvent` theo quyền |
| Cảnh báo | Kết quả RuleSet theo lỗi chặn, cảnh báo, gợi ý, kiểm tra pháp lý |
| Trợ lý AI | Gợi ý tùy chọn có nguồn, không tự áp dụng và có thể tắt hoàn toàn |

## 3. Các chế độ làm việc

| Chế độ | Mục tiêu | Quyền sửa |
| --- | --- | --- |
| Soạn thảo cấu trúc | Chỉnh cây và nội dung trong `DraftWorkspace` | Theo quyền hồ sơ và RuleSet |
| Trình bày truyền thống | Xem bản sinh theo mẫu/quy tắc | Chỉ xem; sửa phải quay về cấu trúc |
| So sánh phiên bản | So `DraftVersion`, nhánh hoặc workspace với mốc | Không sửa trực tiếp bản bất biến |
| Xử lý góp ý | Duyệt ý kiến, đề xuất tiếp thu/không tiếp thu, tạo thay đổi có căn cứ | Quyết định bởi người có quyền |
| Văn bản sửa đổi | Tạo và quản lý `AmendmentOperation` | Theo quyền và kiểm tra xung đột |
| Bản dự kiến sau sửa đổi | Xem projection và nguồn từng thay đổi | Chỉ xem; sửa thao tác nguồn |
| Chỉ đọc/phát hành | Xem `DraftVersion`/gói bị khóa, tạo đầu ra theo quyền | Không sửa nội dung đã phát hành |

Chuyển chế độ không tạo bản sao nội dung. Mọi chế độ đọc cùng mô hình cấu trúc hoặc projection có nguồn xác định.

## 4. Hành vi biên tập và phiên bản

### 4.1. Tự động lưu và đồng bộ

- Thay đổi hợp lệ được tự động lưu vào `DraftWorkspace` theo thay đổi, sau một thời gian chờ có thể cấu hình.
- Tự động lưu không tạo `DraftVersion`.
- Thanh trên luôn phản ánh trạng thái đồng bộ, không dùng thông báo “đã lưu” khi máy chủ chưa xác nhận.
- Nếu rời trang khi còn nội dung chưa đồng bộ, hiển thị cảnh báo và lựa chọn ở lại/thử lại; không tạo `DraftVersion` ngầm.

### 4.2. Checkpoint, undo/redo và khôi phục

- Checkpoint được tạo khi tạo `DraftVersion`, trước khôi phục, trước hợp nhất, theo chu kỳ cấu hình hoặc khi người dùng chủ động yêu cầu.
- Undo/redo chỉ phục vụ phiên biên tập hiện tại; khôi phục dài hạn sử dụng checkpoint.
- Khôi phục checkpoint hiển thị xem trước khác biệt, yêu cầu xác nhận, cập nhật workspace và tạo `AuditEvent`.
- Khôi phục không sửa hoặc xóa `DraftVersion` đã có.

### 4.3. Tạo DraftVersion

1. Người dùng chọn “Tạo phiên bản”.
2. Hệ thống kiểm tra trạng thái đồng bộ và lỗi cấu trúc.
3. Người dùng nhập nhãn, mục đích và căn cứ/mốc nghiệp vụ liên quan.
4. Hệ thống hiển thị tóm tắt thay đổi và RuleSet áp dụng.
5. Người có quyền xác nhận tạo mốc.
6. `DraftVersion` bất biến được tạo; workspace tiếp tục từ mốc đó.

Không phải mỗi lần tự động lưu hoặc checkpoint đều tạo phiên bản.

Giao diện tạo phiên bản hiển thị danh sách phiên bản đã có và biểu mẫu chốt mốc mới. Mã mới được đề xuất tuần tự, chỉ đọc và không tái sử dụng. Người dùng chọn phiên bản nguồn, nhánh, một hoặc nhiều căn cứ tạo phiên bản, xem tập thay đổi được đưa vào, thay đổi chờ duyệt, lỗi chặn/cảnh báo và xác nhận tạo checkpoint. Tên phiên bản được đề xuất từ căn cứ; người dùng chỉ bổ sung mô tả.

Căn cứ có thể phát sinh từ chỉ đạo các cấp, thông báo kết luận, họp Tổ soạn thảo, lấy ý kiến, thẩm định, rà soát, hợp nhất, khôi phục checkpoint hoặc loại khác. Biểu mẫu thay đổi trường theo loại căn cứ và có thể chọn `SourceDocument` đã có hoặc minh họa tải tệp. Tệp chưa được lưu phải ghi rõ **“Chưa lưu tệp lên hệ thống”**; việc chọn tệp không được báo như đã tải lên khi chưa có máy chủ xác nhận.

### 4.4. Cộng tác và khóa mềm

- Phiên bản 1 cho phép nhiều người xem đồng thời.
- Tại một thời điểm chỉ một người được sửa một `LegalNode`.
- Khóa mềm hiển thị người đang sửa và thời điểm khóa; người khác vẫn được xem theo quyền.
- Khóa có thời hạn và cơ chế giải phóng khi hết hạn hoặc khi phiên làm việc kết thúc hợp lệ.
- Không triển khai đồng biên tập thời gian thực trên cùng một nút trong phiên bản 1.
- Chiếm lại hoặc giải phóng khóa bất thường phải theo quyền và tạo dấu vết kiểm toán.

### 4.5. Phát hành và khóa

- Chỉ `DraftVersion` được chọn làm phương án dự thảo trong `ReleasePackage`.
- Gói có thể chứa một phương án chính, nhiều phương án thay thế hoặc không có phương án chính khi xin lựa chọn.
- Biểu mẫu, phụ lục và tài liệu tham chiếu được thêm đúng loại, không giả làm dự thảo.
- Trước phát hành, hiển thị lỗi chặn, cảnh báo cần xác nhận, đối tượng nhận và vấn đề xin ý kiến/quyết định.
- Sau phát hành, gói và các mục bị khóa; thay đổi tạo gói mới.

Người soạn tạo nội dung/đề xuất; Tổ trưởng hoặc đầu mối soạn thảo duyệt nghiệp vụ; người có thẩm quyền duyệt bản phát hành. Vai trò cụ thể được cấu hình theo hồ sơ. Hệ thống và AI không tự giải quyết xung đột hoặc thay người có quyền lựa chọn phương án và ghi lý do.

## 5. Hành vi cấu trúc quan trọng

- Thêm nút chỉ hiển thị loại hợp lệ tại vị trí đang chọn.
- Di chuyển hiển thị trước cha mới, vị trí, số và tham chiếu bị ảnh hưởng.
- Xóa/bãi bỏ được phân biệt: xóa nội dung chưa chốt không đồng nghĩa lệnh bãi bỏ pháp lý.
- Bàn phím hỗ trợ thêm nút cùng cấp/con, điều hướng, mở tìm kiếm và thao tác biên tập.
- Khi RuleSet quản lý số Điều/Khoản/Điểm, người dùng không nhập số trực tiếp; có thể yêu cầu khóa số nếu quy tắc cho phép.
- Dán nội dung được làm sạch; định dạng không hỗ trợ phải được báo trước khi áp dụng.
- Nhãn nghiệp vụ, trạng thái phê duyệt và cảnh báo không được chen vào câu chữ pháp lý. Chúng được đặt bằng marker ở lề nút, không che chữ hoặc làm đổi độ rộng dòng; hover/focus cho tóm tắt và click mở bảng truy nguyên. Có điều khiển bật/tắt marker; chế độ Bản hoàn thiện mặc định ẩn marker. Nội dung thêm/xóa tiếp tục dùng `ins`/`del` có ngữ nghĩa và không dựa riêng vào màu.

### 5.1. Vấn đề cần quyết định

Tab Ý kiến hoặc mục chuyên biệt hiển thị số `ResolutionCase` đang chờ, các ý kiến nguồn và phương án A/B tách biệt. Chọn phương án làm nổi nội dung xem trước nhưng không áp dụng vào workspace. Nếu chọn kết hợp, giao diện tạo phương án C mới và giữ A/B. Trước xác nhận phải nhập lý do, căn cứ thẩm quyền và yêu cầu chỉnh lý nếu có; kết quả ở nguyên mẫu chỉ là thông báo mô phỏng, không tạo `LegalChange` hoặc ghi dữ liệu máy chủ.

## 6. Vai trò và phạm vi quyền

| Vai trò nền | Phạm vi trách nhiệm điển hình |
| --- | --- |
| Người xem | Xem nội dung, phiên bản và lịch sử trong phạm vi được cấp |
| Người góp ý | Tạo ý kiến, phản hồi hoặc tài liệu góp ý |
| Người soạn thảo | Biên tập workspace và tạo đề xuất thay đổi |
| Người kiểm chứng văn bản nguồn | Đối chiếu nguồn nhập, checksum và nội dung cấu trúc trước khi dùng sửa đổi |
| Tổ trưởng/đầu mối soạn thảo | Duyệt nghiệp vụ, phân công và quyết định xử lý trong phạm vi hồ sơ |
| Chuyên viên pháp chế | Kiểm chứng căn cứ/quy tắc và thực hiện nhiệm vụ pháp chế được giao |
| Người phê duyệt phát hành | Duyệt `DraftVersion`/`ReleasePackage` để phát hành theo thẩm quyền |
| Quản trị nghiệp vụ | Đề xuất/cấu hình quy trình, RuleSet và danh mục nghiệp vụ |
| Quản trị hệ thống | Quản lý vận hành kỹ thuật, không mặc nhiên có thẩm quyền nội dung pháp lý |

Quyền có thể giới hạn theo hồ sơ, nhánh, phiên bản và đợt xử lý. Việc có vai trò toàn hệ thống không mặc nhiên tạo quyền trong mọi hồ sơ. Chi tiết ma trận quyền, phân tách trách nhiệm và ủy quyền sẽ được thiết kế trong tài liệu IAM riêng.

## 7. AI tùy chọn

AI có thể gợi ý diễn đạt, tham chiếu, phân loại ý kiến, phát hiện xung đột hoặc nội dung cần kiểm tra. Mỗi gợi ý phải:

- phân biệt rõ với nội dung đã được xác nhận;
- hiển thị nguồn/căn cứ khi có;
- cho phép chấp nhận, sửa hoặc từ chối từng mục;
- không tự tạo `DraftVersion`, tự tiếp thu ý kiến, tự xử lý cảnh báo, tự phê duyệt RuleSet hoặc tự phát hành;
- không làm cản trở luồng thủ công khi bị tắt hoặc không khả dụng.

## 8. Luồng thao tác minh họa

### 8.1. Tạo Điều mới

1. Chọn vị trí hợp lệ trong cây.
2. Chọn “Thêm Điều”; editor chỉ cho phép nếu RuleSet chấp nhận.
3. Hệ thống tạo ID, đặt nút vào thứ tự và tính số hiển thị.
4. Người dùng nhập nội dung; thay đổi lưu vào workspace.
5. Hệ thống cập nhật cảnh báo và tham chiếu bị ảnh hưởng.

### 8.2. Thêm Khoản

1. Chọn Điều và thao tác thêm nút con.
2. Chọn Khoản trong danh sách loại hợp lệ.
3. Hệ thống tạo ID và số tính toán; người dùng chỉ nhập nội dung.
4. Nếu vượt giới hạn cấu trúc, thao tác bị từ chối kèm mã quy tắc.

### 8.3. Di chuyển Điều

1. Kéo Điều hoặc dùng lệnh “Di chuyển”.
2. Editor chỉ đánh dấu các điểm đặt hợp lệ.
3. Xem trước số mới và tham chiếu bị ảnh hưởng.
4. Xác nhận; hệ thống giữ ID, cập nhật thứ tự/số hiển thị và ghi lịch sử.

### 8.4. Tiếp thu một ý kiến

1. Mở ý kiến tại cột phải và xem đúng phiên bản/nút được góp ý.
2. Chọn tiếp thu, tiếp thu một phần, không tiếp thu hoặc yêu cầu làm rõ.
3. Nhập giải trình và nội dung đề xuất; AI chỉ có thể gợi ý.
4. Người có quyền xác nhận `CommentResolution`.
5. Thay đổi được áp dụng vào workspace và liên kết `LegalChange` với ý kiến/kết luận liên quan.

### 8.5. Sửa đổi một Khoản của văn bản gốc

1. Chọn đúng phiên bản nguồn đã kiểm chứng và Khoản theo ID.
2. Chọn loại `AmendmentOperation`, ví dụ thay thế.
3. Editor hiển thị nội dung nguồn, nội dung đề xuất, căn cứ và cảnh báo phiên bản cũ.
4. Người dùng hoàn thiện đề xuất; hệ thống kiểm tra xung đột.
5. Projection được tái tạo và hiển thị nguồn thay đổi; người có quyền chốt thao tác.

### 8.6. Tạo phiên bản dự thảo

Thực hiện luồng tại mục 4.3. Phiên bản mới ghi nhánh, mốc cha/nguồn hợp nhất, RuleSet và căn cứ phát sinh thay đổi; workspace không bị biến thành bản có thể sửa của phiên bản đã chốt.

### 8.7. Phát hành bản lấy ý kiến

1. Chọn một hoặc nhiều `DraftVersion` và vai trò trong gói.
2. Nếu nhiều phương án, ghi vấn đề xin ý kiến; có thể không chọn `PRIMARY`.
3. Thêm biểu mẫu/phụ lục đúng loại và xác định đối tượng, thời hạn theo workflow đã được xác nhận.
4. Chạy kiểm tra; xử lý lỗi chặn và xác nhận cảnh báo theo quyền.
5. Người có thẩm quyền phát hành; gói bị khóa và tạo dấu vết.

### 8.8. Xem và xuất văn bản truyền thống

1. Chọn workspace để xem trước hoặc `DraftVersion` để tạo đầu ra chính thức trong gói.
2. Chọn chế độ truyền thống và mẫu/RuleSet đã gán.
3. Hệ thống sinh trình bày từ dữ liệu cấu trúc; người dùng không sửa trực tiếp bản xem.
4. Khi đủ quyền, sinh DOCX/PDF có metadata nguồn và phiên bản cấu hình.

## 9. Mẫu xuất và giai đoạn thiết kế xuất bản

- Mẫu trình bày truyền thống, DOCX và PDF sẽ được thiết kế sau khi thu thập và kiểm chứng mẫu chính thức.
- Structured content tiếp tục là nguồn nội dung duy nhất.
- Mẫu xuất chỉ quyết định trình bày và không được làm thay đổi nội dung pháp lý.
- Thu thập mẫu, kiểm chứng nguồn, phiên bản hóa mẫu, thiết kế ánh xạ và kiểm thử đầu ra là danh sách công việc của giai đoạn thiết kế xuất bản.

## 10. Bàn phím và khả năng tiếp cận

- Hỗ trợ thao tác bàn phím cho các chức năng chính.
- Thứ tự focus phải hợp lý, điều khiển có nhãn rõ ràng và tương phản phù hợp.
- Không dựa riêng vào màu sắc để truyền đạt trạng thái, lỗi, cảnh báo hoặc thay đổi.
- Phím tắt cụ thể và tiêu chuẩn cần tuân thủ sẽ được kiểm chứng ở giai đoạn thiết kế giao diện chi tiết.
- Không tuyên bố đạt một tiêu chuẩn khả năng tiếp cận khi chưa kiểm thử theo tiêu chí đã được phê duyệt.

## 11. Trạng thái lỗi và khả năng phục hồi

- Mất kết nối: giữ rõ trạng thái chưa đồng bộ, không báo thành công giả.
- Khóa mềm trùng hoặc hết hạn: không ghi đè âm thầm; hiển thị chủ thể/thời điểm khóa và cơ chế thử lại hoặc giải phóng theo quyền.
- RuleSet không khả dụng: cho phép đọc/biên tập an toàn theo chính sách nhưng chặn phát hành nếu không kiểm tra được.
- Tham chiếu hỏng: điều hướng tới nguồn vấn đề và danh sách nút bị ảnh hưởng.
- Phiên bản nguồn sửa đổi không khớp: chặn áp dụng thao tác, yêu cầu đối chiếu lại.

## 12. Nội dung còn hoãn hoặc cần kiểm chứng

- Ma trận quyền chi tiết trong tài liệu IAM, gồm phân tách trách nhiệm và ủy quyền.
- Giá trị thời gian chờ tự động lưu, chu kỳ checkpoint và thời hạn khóa mềm.
- Danh mục phím tắt và tiêu chuẩn khả năng tiếp cận sau khi kiểm chứng ở thiết kế giao diện chi tiết.
- Quy tắc trình bày chi tiết khác biệt nội dung và thay đổi cấu trúc theo từng loại `LegalNode`, sau khi có mẫu nghiệp vụ được xác nhận.
- Thu thập, kiểm chứng và thiết kế mẫu trình bày truyền thống, DOCX/PDF trong giai đoạn thiết kế xuất bản.
- Thuật ngữ/nút giao diện chính thức bằng tiếng Việt cho từng loại văn bản.
- RuleSet và các hành vi giao diện riêng cho Nghị định sau phiên bản 1.

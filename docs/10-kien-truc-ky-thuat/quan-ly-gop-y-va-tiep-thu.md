# Quản lý góp ý và tiếp thu

## Phạm vi

Mô-đun tạo dữ liệu nguồn để xây một phiên bản dự thảo mới trên nền phiên bản trước và để sinh “Bản tổng hợp ý kiến, tiếp thu, giải trình ý kiến góp ý, phản biện xã hội đối với dự thảo”. Nguyên mẫu đã có kết xuất DOCX phía trình duyệt từ dữ liệu cấu trúc; đây chưa phải pipeline xuất bản P2 hoàn chỉnh và chưa sinh PDF.

Hai mẫu DOCX nguyên mẫu được khai báo tại `app/web/src/config/publishing-templates/v1.json`, có mã, phiên bản và trạng thái riêng. Khi có tệp mẫu chính thức, phải tạo phiên bản mẫu mới và ánh xạ dữ liệu; không sửa hồi tố cấu hình mẫu đã được sử dụng.

M2 development đã nối màn hình Bước 1 với API comments/PostgreSQL khi hồ sơ, phiên bản dự thảo và đợt góp ý mẫu được cấu hình. Seed development tạo các đối tượng giả định và quyền `COMMENT_READ`/`COMMENT_CREATE`; nếu thiếu cấu hình, màn hình cũ chỉ được dùng như fallback nguyên mẫu. Màn hình xử lý kết quả, liên kết thay đổi và xuất biểu mẫu vẫn cần được chuyển hoàn toàn khỏi localStorage trong hạng mục tiếp theo.

## Luồng nghiệp vụ

1. Mở `ReviewRound` và ghim `sourceDraftVersionId`; ý kiến không được tự chuyển sang phiên bản nguồn khác.
2. Nhập nguyên văn ý kiến với chủ thể và nội dung góp ý/phản biện. Phạm vi được chọn chính xác theo Mục, Chương, Điều, Khoản hoặc Điểm của phiên bản nguồn; ý kiến chính sách/chung dùng `OTHER` (Ý kiến khác) và không bị gắn giả tạo vào LegalNode.
3. Điều chỉnh workspace trên nền phiên bản nguồn. Khi trình soạn thảo phát hiện nội dung trước/sau khác nhau, người soạn thảo chọn một hoặc nhiều ý kiến làm căn cứ ngay tại vị trí sửa đổi.
4. Trình soạn thảo tạo liên kết thay đổi–ý kiến; màn hình tổng hợp chỉ đọc liên kết và dựng so sánh trước/sau, không cho chọn lại thay đổi.
5. Quay lại màn hình tổng hợp để chốt một trong ba kết quả: `ACCEPTED_AND_UPDATED`, `PARTIALLY_ACCEPTED` hoặc `EXPLAINED_NOT_ACCEPTED`.
6. Hai kết quả tiếp thu bắt buộc có thay đổi và DraftVersion áp dụng. `PARTIALLY_ACCEPTED` và `EXPLAINED_NOT_ACCEPTED` bắt buộc có giải trình/phạm vi tiếp thu; `ACCEPTED_AND_UPDATED` không bắt buộc trường này.
7. Tạo DraftVersion mới với phiên bản trước làm parent và các nguồn xử lý làm basis.

Chỉ đạo và việc Tổ soạn thảo tự điều chỉnh không được giả làm ý kiến góp ý. Chúng dùng nguồn `DIRECTION` hoặc `DRAFTING_TEAM_INITIATIVE` riêng khi liên kết thay đổi.

### Sửa đổi phát sinh tại Bước 4

Workspace hoàn thiện dự thảo cho phép phát sinh thêm sửa đổi nhưng không ghi đè `DraftVersion` đã dùng để xin ý kiến hoặc kết luận. Mỗi sửa đổi trước hết được ghi thành phiếu chờ duyệt, gồm nội dung trước/sau, nút cấu trúc, người thực hiện, thời điểm, lý do và một trong bốn nguồn: thực hiện kết luận Bước 3, chỉnh lý kỹ thuật, Tổ soạn thảo tự điều chỉnh hoặc chỉ đạo/tình tiết mới.

Tổ soạn thảo tự điều chỉnh và chỉ đạo mới bắt buộc có căn cứ thẩm quyền. Nếu nội dung phát sinh làm thay đổi kết luận Bước 3, giao diện cảnh báo và bắt buộc ghi căn cứ kết luận bổ sung; chưa có quyết định phù hợp thì phiếu không được chuyển thành `LegalChange` đã áp dụng. Khi được duyệt, thay đổi phải được đưa vào một `DraftVersion` mới và liên kết nguồn; không sửa snapshot bất biến của phiên bản trước.

Phiếu Bước 4 được lưu trong PostgreSQL theo migration `0012_step4_change_proposal.sql`. API cho phép tạo, liệt kê và ghi quyết định duyệt, từ chối hoặc yêu cầu sửa; đề xuất và mọi quyết định là bản ghi bất biến, quyết định sau tham chiếu quyết định bị thay thế. Giao diện chỉ dùng `localStorage` làm fallback có cảnh báo khi workspace phát triển chưa được cấu hình.

Migration `0013_step4_finalization.sql` hoàn thiện thao tác kết thúc Bước 4. Trước khi chốt, server kiểm tra workspace revision, mọi phiếu chưa xuất bản đã có quyết định, không còn phiếu yêu cầu sửa, có ít nhất một phiếu được duyệt và chuỗi `beforeState → afterState` khớp nội dung hiện tại theo từng LegalNode. Một transaction duy nhất tạo checkpoint `PRE_VERSION`, `DraftVersion` bất biến, cạnh phiên bản cha, trạng thái tất cả LegalNode, `draft_legal_node_change`, căn cứ thay đổi, căn cứ phiên bản, liên kết phiếu–thay đổi–lần chốt và audit event; sau đó mới đồng bộ workspace sang mốc mới. Báo cáo hoàn thành và căn cứ thẩm quyền là dữ liệu bắt buộc. Phiếu bị từ chối vẫn được giữ trong lịch sử nhưng không đi vào phiên bản mới.

Smoke test PostgreSQL development ngày 28/08/2026 đã đi qua toàn bộ chuỗi tạo phiếu → duyệt → kiểm tra điều kiện → chốt phiên bản và đối chiếu thành công checksum, parent edge, version basis, LegalChange, proposal link và audit. Kết quả này hoàn thiện luồng nghiệp vụ thủ công của Bước 4 trong M2 development; không phải nghiệm thu triển khai NAS hoặc pipeline xuất bản DOCX/PDF.

## Bất biến và sửa sai

- Nội dung ý kiến, đích góp ý và kết quả xử lý đã ghi là bất biến.
- Điều chỉnh kết quả tạo `CommentResolution` có sequence mới và trỏ bản bị thay thế.
- AI không tạo quyết định xử lý.
- Bản tổng hợp lấy dữ liệu từ ý kiến, resolution và thay đổi đã liên kết; không dò tìm tương đồng văn bản để suy đoán.
- Cột nội dung trước/sau được dựng từ `before_state`/`after_state` của các thay đổi đã liên kết, không nhập lại bằng tay trong resolution.
- Một ý kiến có thể trỏ nhiều LegalNode của đúng DraftVersion nguồn.
- Nhiều ý kiến có thể cùng làm căn cứ cho một thay đổi và một ý kiến có thể dẫn đến nhiều thay đổi.

## API phiên bản 1

| Method | Route | Mục đích |
| --- | --- | --- |
| `GET` | `/api/v1/projects/{projectId}/comments` | Danh sách ý kiến và trạng thái xử lý |
| `POST` | `/api/v1/projects/{projectId}/comments` | Ghi nhận ý kiến |
| `POST` | `/api/v1/projects/{projectId}/comments/{commentId}/resolutions` | Ghi một lần tiếp thu/giải trình mới |
| `GET` | `/api/v1/projects/{projectId}/comments/{commentId}/resolutions` | Đọc toàn bộ lịch sử xử lý bất biến |
| `GET` | `/api/v1/projects/{projectId}/draft-changes` | Liệt kê thay đổi đã chốt có thể làm căn cứ tiếp thu |

## Phạm vi M3 development

Màn tổng hợp M3 dùng PostgreSQL làm nguồn dữ liệu duy nhất khi hồ sơ development đã cấu hình. Người xử lý chọn một ý kiến, ghi một `CommentResolution` mới và xem lại toàn bộ sequence trước đó. Kết quả tiếp thu toàn bộ hoặc một phần bắt buộc liên kết ít nhất một `draft_legal_node_change`; tất cả thay đổi liên kết phải thuộc cùng `effective_draft_version_id`. Server đồng thời ghi chiều ngược trong `draft_change_basis`, vì vậy có thể truy từ ý kiến tới thay đổi và từ thay đổi về căn cứ xử lý.

DOCX tổng hợp ý kiến trên màn M3 được dựng từ `Comment`, `CommentResolution` và các ID thay đổi đã lưu trong PostgreSQL, không đọc kho góp ý `localStorage`. Hồ sơ chưa có `LegalChange` đã chốt vẫn có thể ghi kết quả không tiếp thu kèm giải trình; thao tác tiếp thu được giữ khóa cho tới khi hoàn tất Bước 4.

API yêu cầu adapter danh tính. `AUTH_MODE=development` chỉ dành cho máy phát triển; actor trong payload không được tin cậy. IAM và phân quyền chi tiết vẫn thuộc P0-06.

## Trạng thái giao diện

Đường dẫn nguyên mẫu:

- `/ho-so/du-thao-thong-tu-mau/gop-y`: nhập một phiếu của một đơn vị; một phiếu có nhiều ý kiến thành phần.
- `/ho-so/du-thao-thong-tu-mau/gop-y/tong-hop`: tổng hợp và xử lý ý kiến của toàn bộ đơn vị.

Màn hình nhập dùng cây cấu trúc để chọn Mục/Chương/Điều/Khoản/Điểm và hiển thị nội dung đích bên cạnh ô nhập. Ý kiến chính sách/chung dùng “Ý kiến khác”. Liên kết sửa đổi chỉ thực hiện tại trình soạn thảo sau khi nội dung thay đổi; các màn hình chia sẻ kho nguyên mẫu trong `localStorage` để mô phỏng lượt đi–về. Đây vẫn là giao diện minh họa tương tác, chưa gọi API vì repository chưa có PostgreSQL thử nghiệm và ReviewRound seed. API, migration và validation là phần backend thật; cần integration test PostgreSQL trước khi gọi mô-đun là chức năng hoàn chỉnh.

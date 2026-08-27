# Quản lý góp ý và tiếp thu

## Phạm vi

Mô-đun tạo dữ liệu nguồn để xây một phiên bản dự thảo mới trên nền phiên bản trước và để sinh “Bản tổng hợp ý kiến, tiếp thu, giải trình ý kiến góp ý, phản biện xã hội đối với dự thảo”. Nguyên mẫu đã có kết xuất DOCX phía trình duyệt từ dữ liệu cấu trúc; đây chưa phải pipeline xuất bản P2 hoàn chỉnh và chưa sinh PDF.

Hai mẫu DOCX nguyên mẫu được khai báo tại `app/web/src/config/publishing-templates/v1.json`, có mã, phiên bản và trạng thái riêng. Khi có tệp mẫu chính thức, phải tạo phiên bản mẫu mới và ánh xạ dữ liệu; không sửa hồi tố cấu hình mẫu đã được sử dụng.

## Luồng nghiệp vụ

1. Mở `ReviewRound` và ghim `sourceDraftVersionId`; ý kiến không được tự chuyển sang phiên bản nguồn khác.
2. Nhập nguyên văn ý kiến với chủ thể và nội dung góp ý/phản biện. Phạm vi được chọn chính xác theo Mục, Chương, Điều, Khoản hoặc Điểm của phiên bản nguồn; ý kiến chính sách/chung dùng `OTHER` (Ý kiến khác) và không bị gắn giả tạo vào LegalNode.
3. Điều chỉnh workspace trên nền phiên bản nguồn. Khi trình soạn thảo phát hiện nội dung trước/sau khác nhau, người soạn thảo chọn một hoặc nhiều ý kiến làm căn cứ ngay tại vị trí sửa đổi.
4. Trình soạn thảo tạo liên kết thay đổi–ý kiến; màn hình tổng hợp chỉ đọc liên kết và dựng so sánh trước/sau, không cho chọn lại thay đổi.
5. Quay lại màn hình tổng hợp để chốt một trong ba kết quả: `ACCEPTED_AND_UPDATED`, `PARTIALLY_ACCEPTED` hoặc `EXPLAINED_NOT_ACCEPTED`.
6. Hai kết quả tiếp thu bắt buộc có thay đổi và DraftVersion áp dụng. `PARTIALLY_ACCEPTED` và `EXPLAINED_NOT_ACCEPTED` bắt buộc có giải trình/phạm vi tiếp thu; `ACCEPTED_AND_UPDATED` không bắt buộc trường này.
7. Tạo DraftVersion mới với phiên bản trước làm parent và các nguồn xử lý làm basis.

Chỉ đạo và việc Tổ soạn thảo tự điều chỉnh không được giả làm ý kiến góp ý. Chúng dùng nguồn `DIRECTION` hoặc `DRAFTING_TEAM_INITIATIVE` riêng khi liên kết thay đổi.

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

API yêu cầu adapter danh tính. `AUTH_MODE=development` chỉ dành cho máy phát triển; actor trong payload không được tin cậy. IAM và phân quyền chi tiết vẫn thuộc P0-06.

## Trạng thái giao diện

Đường dẫn nguyên mẫu:

- `/ho-so/du-thao-thong-tu-mau/gop-y`: nhập một phiếu của một đơn vị; một phiếu có nhiều ý kiến thành phần.
- `/ho-so/du-thao-thong-tu-mau/gop-y/tong-hop`: tổng hợp và xử lý ý kiến của toàn bộ đơn vị.

Màn hình nhập dùng cây cấu trúc để chọn Mục/Chương/Điều/Khoản/Điểm và hiển thị nội dung đích bên cạnh ô nhập. Ý kiến chính sách/chung dùng “Ý kiến khác”. Liên kết sửa đổi chỉ thực hiện tại trình soạn thảo sau khi nội dung thay đổi; các màn hình chia sẻ kho nguyên mẫu trong `localStorage` để mô phỏng lượt đi–về. Đây vẫn là giao diện minh họa tương tác, chưa gọi API vì repository chưa có PostgreSQL thử nghiệm và ReviewRound seed. API, migration và validation là phần backend thật; cần integration test PostgreSQL trước khi gọi mô-đun là chức năng hoàn chỉnh.

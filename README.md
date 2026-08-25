# Hệ thống hỗ trợ xây dựng văn bản quy phạm pháp luật

Tên mã nguồn: `legal-document-builder`

## Mục tiêu

Xây dựng ứng dụng web chạy trên NAS, hỗ trợ xây dựng văn bản quy phạm pháp luật mới hoặc sửa đổi, bổ sung văn bản hiện hành.

## Phạm vi ban đầu

Giai đoạn hiện tại tập trung xác định phạm vi sản phẩm, rà soát căn cứ pháp lý, phân tích nghiệp vụ, thiết kế quy trình, mô hình dữ liệu, giao diện, phương án tích hợp AI, kiểm thử và triển khai trên NAS. Chưa xây dựng mã nguồn ứng dụng, cơ sở dữ liệu hoặc hạ tầng triển khai.

## Nguyên tắc kiến trúc

- Structured Legal Editor là nguồn dữ liệu chính; DOCX, PDF và bản trình bày truyền thống được sinh từ dữ liệu cấu trúc.
- Quy trình nghiệp vụ, quy tắc thể thức và mẫu biểu được phiên bản hóa, không lập trình cứng.
- Bước quy trình và phiên bản dự thảo là hai trục độc lập.
- Mọi thay đổi dự thảo phải có khả năng truy nguyên về căn cứ nghiệp vụ tương ứng.
- AI là mô-đun tùy chọn, không có quyền tự phê duyệt, tự tiếp thu hoặc ghi đè dự thảo chính.
- Hệ thống phải vận hành thủ công đầy đủ khi không có AI.
- Không sửa trực tiếp hệ thống đang vận hành trên NAS; mọi thay đổi phải được kiểm thử trước khi đóng gói triển khai.

## Cấu trúc tài liệu

- `docs/01-pham-vi-san-pham/`: phạm vi, mục tiêu và yêu cầu sản phẩm.
- `docs/02-can-cu-phap-ly/`: căn cứ pháp lý và theo dõi hiệu lực.
- `docs/03-phan-tich-nghiep-vu/`: nghiệp vụ, vai trò và tình huống sử dụng.
- `docs/04-thiet-ke-quy-trinh/`: quy trình xây dựng, sửa đổi và bổ sung văn bản.
- `docs/05-mo-hinh-du-lieu/`: mô hình dữ liệu cấu trúc và truy nguyên.
- `docs/06-thiet-ke-giao-dien/`: thiết kế trải nghiệm và giao diện người dùng.
- `docs/07-tich-hop-ai/`: phạm vi, nguyên tắc an toàn và phương án tích hợp AI.
- `docs/08-kiem-thu/`: chiến lược, kịch bản và kết quả kiểm thử.
- `docs/09-trien-khai-nas/`: kiến trúc vận hành và quy trình triển khai NAS.

## Trạng thái hiện tại

Đang phân tích và thiết kế nghiệp vụ, chưa lập trình.

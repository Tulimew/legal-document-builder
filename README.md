# Hệ thống hỗ trợ xây dựng văn bản quy phạm pháp luật

Tên mã nguồn: `legal-document-builder`

## Mục tiêu

Xây dựng ứng dụng web chạy trên NAS, hỗ trợ xây dựng văn bản quy phạm pháp luật mới hoặc sửa đổi, bổ sung văn bản hiện hành.

## Phạm vi ban đầu

Giai đoạn hiện tại đang hoàn thiện nền tảng kỹ thuật sau nguyên mẫu giao diện M1. Repository đã có ứng dụng Next.js dùng dữ liệu giả, hợp đồng dữ liệu, migration PostgreSQL, API nền và IAM/phân quyền nền; migration chưa được chạy trên môi trường database thật và chưa tích hợp nhà cung cấp định danh, AI thật hoặc hạ tầng triển khai NAS.

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
- `docs/10-kien-truc-ky-thuat/`: kiến trúc tổng thể, ranh giới mô-đun và quyết định kỹ thuật.

Hợp đồng dữ liệu dùng chung được đặt tại `packages/contracts/`; đây là schema trao đổi, không phải schema CSDL vật lý.
Migration PostgreSQL được đặt tại `packages/database/`; chỉ chạy sau khi kiểm thử trên môi trường database tách biệt, không chạy trực tiếp trên NAS đang vận hành.

## Trạng thái hiện tại

Đang triển khai mốc M3 trong môi trường development. Luồng tổng hợp góp ý đọc/ghi PostgreSQL, lưu lịch sử xử lý bất biến, liên kết kết quả tiếp thu với `DraftVersion` và `LegalChange` đã chốt, đồng thời sinh DOCX tổng hợp trực tiếp từ dữ liệu góp ý có cấu trúc. M3 chưa tích hợp AI thật và chưa phải bản sẵn sàng triển khai production hoặc NAS.

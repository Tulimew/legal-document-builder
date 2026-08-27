# Nguyên mẫu giao diện web

Ứng dụng Next.js mô phỏng giao diện nền cho Hệ thống hỗ trợ xây dựng văn bản quy phạm pháp luật. Toàn bộ nội dung là dữ liệu giả định, không có giá trị pháp lý và không được ghi lên máy chủ.

Kịch bản mẫu được chụp tại ngày 30/08/2026: `DT-006` là phiên bản hiện tại trên `Nhánh hợp nhất`, và phiên bản kế tiếp được đề xuất là `DT-007`.

## Route nguyên mẫu

- `/`: Tổng quan hồ sơ mẫu.
- `/ho-so/du-thao-thong-tu-mau/soan-thao`: Structured Legal Editor tương tác.

## Chạy cục bộ

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`. Kiểm tra bằng `npm run lint` và `npm run build`.

Nguyên mẫu giao diện chưa nối CSDL thật. Repository đã có API và IAM/phân quyền nền nhưng chưa chạy migration PostgreSQL hoặc tích hợp nhà cung cấp định danh; AI và lưu trữ server cũng chưa được cấu hình.

Màn hình nhập phiếu góp ý: `http://localhost:3000/ho-so/du-thao-thong-tu-mau/gop-y`; màn hình tổng hợp và xử lý: `http://localhost:3000/ho-so/du-thao-thong-tu-mau/gop-y/tong-hop`. Các màn hình vẫn dùng trạng thái cục bộ; API `/api/v1/projects/{projectId}/comments` chỉ hoạt động sau khi cấu hình PostgreSQL và adapter danh tính phát triển.

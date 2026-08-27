# ADR-0001: Sử dụng modular monolith TypeScript cho phiên bản đầu

- Trạng thái: Chấp thuận làm baseline P0-02.
- Ngày: 26/08/2026.
- Phạm vi: M2 đến hết thử nghiệm M5, trừ khi điều kiện xem xét lại xảy ra.

## Bối cảnh

Sản phẩm có miền nghiệp vụ liên kết chặt giữa hồ sơ, workflow, dự thảo, thay đổi, quyết định, phát hành và audit. Các thao tác tạo phiên bản, phê duyệt và khóa gói cần transaction và truy nguyên nhất quán. Phiên bản đầu dự kiến chạy trên NAS có tài nguyên hữu hạn và đội phát triển chưa có bằng chứng cần scale độc lập nhiều dịch vụ.

Repository hiện có frontend Next.js/TypeScript. Hệ thống phải vận hành thủ công đầy đủ khi không có AI và không chạy tác vụ OCR/PDF nặng trên NAS.

## Quyết định

1. Dùng modular monolith TypeScript cho web, application và domain.
2. Dùng PostgreSQL làm CSDL giao dịch.
3. Tách worker thành tiến trình riêng nhưng dùng chung codebase và mô hình miền.
4. Tách binary khỏi CSDL qua StoragePort.
5. Dùng hàng đợi bền vững dựa trên PostgreSQL ở giai đoạn đầu.
6. Giữ AI, storage và identity sau port/adapter.
7. Không triển khai microservice ở phiên bản đầu.

## Lý do

- Transaction và audit dễ bảo đảm hơn khi các use case cốt lõi ở cùng một ranh giới triển khai.
- Giảm chi phí vận hành, quan sát, backup và nâng cấp trên NAS.
- Tận dụng TypeScript đã có nhưng vẫn tách domain khỏi Next.js.
- Worker riêng ngăn tác vụ xuất bản chặn request tương tác.
- Port/adapter giữ khả năng thay storage, identity hoặc AI khi có thông tin triển khai thực tế.

## Hệ quả tích cực

- Một pipeline build và migration chính.
- Dễ triển khai pilot, sao lưu và rollback hơn microservice.
- Có thể kiểm thử use case theo transaction thật.
- Không cần message broker riêng ở M2.

## Đánh đổi và kiểm soát

| Đánh đổi | Kiểm soát |
| --- | --- |
| Mô-đun có thể phụ thuộc vòng hoặc truy cập dữ liệu của nhau | Quy định dependency, public application service và test kiến trúc |
| Web và nghiệp vụ có thể bị trộn | Domain/application đặt trong package độc lập, không import Next.js |
| Worker và web có thể tranh tài nguyên NAS | Container/tiến trình riêng, concurrency và CPU/RAM limit |
| PostgreSQL job queue có giới hạn tải | Đo metric; chỉ thêm broker khi số liệu chứng minh cần |
| Một deployment có phạm vi ảnh hưởng rộng | Test hồi quy, migration tương thích và rollback artifact |

## Phương án không chọn

### Microservice từ đầu

Không chọn vì tăng số thành phần triển khai, transaction phân tán, quan sát, backup và vận hành mà chưa có bằng chứng tải hoặc tổ chức yêu cầu.

### Toàn bộ logic trong Next.js route/component

Không chọn vì làm domain phụ thuộc framework, khó kiểm thử bất biến và dễ đặt quyền/quy tắc chỉ ở frontend.

### Lưu toàn bộ dữ liệu nghiệp vụ trong tệp hoặc JSON blob

Không chọn vì làm yếu ràng buộc quan hệ, truy vấn, transaction, migration và truy nguyên. JSONB chỉ được dùng có chủ đích cho phần dữ liệu cấu trúc phù hợp.

### Lưu binary trong PostgreSQL

Không chọn làm baseline vì tăng kích thước backup giao dịch và ghép chặt lưu trữ tệp với CSDL. Metadata và checksum vẫn thuộc PostgreSQL.

## Điều kiện xem xét lại

- Worker xuất bản cần scale độc lập vượt khả năng một tiến trình/queue hiện tại.
- Yêu cầu bảo mật buộc một mô-đun chạy ở vùng tin cậy khác.
- Nhiều nhóm phát triển cần chu kỳ phát hành độc lập và ranh giới đã ổn định.
- Số liệu hiệu năng chứng minh một mô-đun gây nghẽn không thể xử lý bằng tối ưu hoặc scale tiến trình.
- Nền tảng NAS mục tiêu không hỗ trợ thành phần baseline.

Mọi thay đổi quyết định phải tạo ADR mới thay thế, không sửa lịch sử để che mất quyết định cũ.

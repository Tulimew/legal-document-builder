# Database

Schema PostgreSQL và migration forward-only của hệ thống.

## Quy ước

- Migration chạy theo thứ tự tên tệp trong `migrations/` và chỉ chạy một lần.
- ID là UUID do application cấp; migration không phụ thuộc extension sinh UUID.
- Mọi thời điểm dùng `timestamptz` và được ghi theo thời gian server.
- Mã nghiệp vụ có khả năng cấu hình dùng `text`, không dùng PostgreSQL enum.
- Snapshot hợp đồng dùng JSONB kèm `contract_version` và SHA-256.
- Binary không lưu trong PostgreSQL; `asset_version.storage_key` là định danh nội bộ của StoragePort.
- Bảng bất biến có trigger chặn `UPDATE` và `DELETE`.

## Migration hiện có

- `0001_p0_04_foundation.sql`: hồ sơ tối thiểu, nội dung cấu trúc, workspace, checkpoint, version, nhánh, asset và truy nguyên thay đổi.
- `0002_p0_04_test_fixture.sql`: transaction kiểm thử có rollback, chỉ dùng dữ liệu giả định.

Runner migration và kết nối môi trường sẽ được tích hợp khi xây backend P0-05. Không chạy migration trực tiếp trên NAS đang vận hành.

# Canonical snapshot checksum sau M3

## Contract

Snapshot mới dùng mã thuật toán `CANONICAL_JSON_V1_SHA256`:

- UTF-8 JSON không có khoảng trắng trình bày;
- key của mọi object được sắp theo thứ tự code point JavaScript trước khi serialize;
- thứ tự array được giữ nguyên;
- số phải hữu hạn và `-0` được chuẩn hóa thành `0`;
- property có giá trị `undefined` bị loại như JSON object thông thường;
- checksum là SHA-256 lowercase hex của đúng canonical byte sequence.

Helper dùng chung nằm tại `app/web/src/server/canonical-json.ts`. Finalization tính checksum bằng helper và verify lại `document_snapshot` sau round-trip PostgreSQL JSONB trước khi commit.

## Compatibility và migration

Migration `0014_snapshot_checksum_algorithm.sql` thêm algorithm marker cho checkpoint và DraftVersion. Record hiện hữu được gắn `LEGACY_JSON_STRINGIFY_SHA256`; checksum cũ không bị ghi đè vì các record này là lịch sử bất biến và không phải checksum nào cũng tái tạo được sau JSONB round-trip. Record mới được gắn `CANONICAL_JSON_V1_SHA256`.

Không có backfill tự động trong migration forward. Nếu chủ dự án quyết định repair record legacy, cần một migration dữ liệu được phê duyệt riêng:

1. xuất danh sách ID, checksum cũ và canonical checksum mới;
2. lưu audit repair độc lập với actor, căn cứ, thời điểm và correlation ID;
3. chỉ tạm vô hiệu trigger immutable trong transaction migration có phạm vi ID xác định;
4. cập nhật checksum và algorithm marker cùng transaction;
5. verify toàn bộ snapshot trước commit;
6. rollback bằng bảng ánh xạ checksum cũ nếu verification thất bại.

Reader phải chọn verifier theo algorithm marker. Legacy checksum không được dùng làm bằng chứng content equality hoặc deduplication. Việc xóa cột marker chỉ an toàn khi chưa có record canonical; sau khi đã có record canonical, rollback ứng dụng phải tiếp tục hiểu cả hai algorithm.

# R20-11 Known Technical Limitations and Security Trust Boundaries

**Dự án:** Unified Legal Hub (ULH)  
**Mã nhiệm vụ:** `ULH-EXEC-020`  
**Giai đoạn:** R20-11 — Final Acceptance Package  
**Ngày lập báo cáo:** 2026-11-23  

---

## 1. Giới thiệu

Báo cáo này tài liệu hóa một cách trung thực, minh bạch và chính xác về mặt kỹ thuật các giới hạn kiến trúc đã biết (Known Limitations) và các ranh giới tin cậy (Trust Boundaries) của hệ thống Unified Legal Hub sau khi hoàn thành triển khai Migration 0032 và 0033.

Việc xác định rõ ràng các giới hạn này giúp Chủ đầu tư và Đơn vị kiểm soát độc lập có cái nhìn thực tế, tránh các tuyên bố quá mức (overclaiming) về tính bảo mật hoặc bất biến tuyệt đối.

---

## 2. Ranh giới bất biến PostgreSQL: Trigger cấp hàng vs Quyền DDL

### 2.1. Bản chất cơ chế bảo vệ
- **Bảo vệ cấp DML (UPDATE, DELETE, TRUNCATE):** Hàm trigger `legal_builder.reject_immutable_change()` được cài đặt dưới dạng `BEFORE UPDATE OR DELETE OR TRUNCATE` trên toàn bộ các bảng C1. Khi có bất kỳ câu lệnh DML nào được thực thi, trigger lập tức ném ngoại lệ `SQLSTATE 55000`. Cơ chế này có hiệu lực đối với **mọi người dùng**, bao gồm cả siêu người dùng `postgres`.
- **Giới hạn cấp DDL (ALTER TABLE, DROP TABLE):** Theo nguyên lý vận hành cốt lõi của PostgreSQL, trigger không thể can thiệp hoặc ngăn chặn các lệnh DDL. Do đó:
  - Siêu người dùng `postgres` và chủ sở hữu bảng `ulh_migrator` có quyền thực thi `ALTER TABLE ... DISABLE TRIGGER ALL;` hoặc `DROP TABLE ...;`. Sau khi vô hiệu hóa trigger, dữ liệu có thể bị xóa hoặc sửa đổi.
- **Ranh giới tin cậy thực tế (Effective Trust Boundary):**
  - Các tài khoản ứng dụng thực tế (`ulh_app_runtime`, `ulh_reconciler`, `ulh_governance_approver`) **không có quyền DDL**. Khi các vai trò này cố gắng thực thi `ALTER TABLE` hoặc `DROP TABLE`, PostgreSQL chặn lại với lỗi phân quyền `SQLSTATE 42501 (must be owner of table)`.
  - **Kết luận:** Tính bất biến được bảo đảm an toàn trước mọi lỗi logic hoặc hành vi xâm nhập thông qua tầng ứng dụng, nhưng phụ thuộc vào việc kiểm soát bí mật (secret management) của tài khoản siêu người dùng và tài khoản migrator tại tầng hạ tầng máy chủ.

---

## 3. Ranh giới tin cậy của Engine xác minh độc lập (Independent Verification)

### 3.1. Các chốt chặn được cơ sở dữ liệu thực thi
Hàm trigger `legal_builder.guard_independent_verification_insert()` thực thi tự động các kiểm tra sau:
1. **Tính bất biến của kết quả:** Chặn hoàn toàn UPDATE và DELETE trên bảng `checksum_independent_verification`.
2. **Tính độc lập siêu dữ liệu (Metadata Inequality):** Bắt buộc `verifier_engine_id <> calculator_engine_id` và `verifier_runtime_family <> calculator_runtime_family`.
3. **Tính nhất quán mã băm:** Bắt buộc mã băm tính toán lại (`recomputed_hashes`) phải khớp chính xác với mã băm đã lưu trữ (`persisted_checksum_sha256`) và thuật toán so khớp.
4. **Đối chiếu 1-1 với Audit Event:** Bắt buộc phải có bản ghi `system_audit_event` tương ứng được ghi nhận trong vòng 5 phút.

### 3.2. Giới hạn phòng vệ chống giả mạo (Anti-Spoofing Limitation)
- **Giới hạn tại tầng CSDL:** Cơ sở dữ liệu PostgreSQL không có khả năng tự mình kiểm tra tiến trình vật lý thực tế trên hệ điều hành. Nếu một tiến trình client độc hại kết nối bằng thông tin đăng nhập hợp lệ và cố tình khai báo sai siêu dữ liệu (ví dụ: client chạy bằng Node.js nhưng gửi `verifier_runtime_family = 'RUST'`), cơ sở dữ liệu sẽ không thể phát hiện sự giả mạo này.
- **Giải pháp kiến trúc bắt buộc tại tầng vận hành (Orchestration Layer):**
  - Cô lập vật lý hoặc cô lập container: Engine quét (Scanner) và Engine xác minh (Verifier) phải được triển khai trên hai container Docker hoặc máy ảo riêng biệt.
  - Phân tách thông tin xác thực: Mỗi engine sử dụng tài khoản hệ điều hành, cặp khóa HMAC và chứng chỉ kết nối CSDL độc lập.

---

## 4. Tập con cú pháp Locator (JSON Pointer & JSONPath Subset)

### 4.1. Phạm vi hỗ trợ
Hàm `legal_builder.is_valid_locator_syntax(p_locator text)` chỉ chấp nhận một tập con nghiêm ngặt:
- **RFC 6901 JSON Pointer:** Bắt đầu bằng `/`, phân tách bằng `/`, chỉ cho phép chuỗi thoát `~0` và `~1`.
- **Deterministic JSONPath:** Bắt đầu bằng `$`, chỉ cho phép ký hiệu chấm (`.prop`) và ký hiệu chỉ số mảng / ngoặc vuông đơn giản (`[0]`, `['prop']`, `["prop"]`).

### 4.2. Giới hạn có chủ đích (Intentional Exclusions)
Hệ thống **chủ động từ chối** các tính năng nâng cao sau của chuẩn JSONPath:
- Ký tự đại diện Wildcard (`*`, `[*]`).
- Ký tự tìm kiếm đệ quy Recursive Descent (`..`).
- Biểu thức lọc điều kiện Filter Expressions (`?[...]`).

**Lý do thiết kế:** Các tính năng trên mang tính phi đơn định (non-deterministic) và phụ thuộc vào trạng thái động của cây tài liệu, không phù hợp cho việc neo giữ bằng chứng kiểm toán pháp lý bất biến theo thời gian.

---

## 5. Khả năng tương thích dữ liệu lịch sử (Historical Data Compatibility)

### 5.1. Dữ liệu kế thừa tiền Migration 0032
- Các bản ghi được tạo ra trước Migration 0032 lưu trữ giá trị `snapshot_checksum_algorithm_code = 'LEGACY_JSON_STRINGIFY_SHA256'` hoặc `'CANONICAL_JSON_V1_SHA256'`.
- Do các bảng C1 là bất biến (`reject_immutable_change`), các bản ghi lịch sử này **không thể và không được phép cập nhật** sang `RFC8785_JCS`.
- Chúng được duy trì nguyên vẹn và xác thực thông qua khung đối soát lịch sử (Historical Provenance Reconciliation) đã được phê duyệt.

### 5.2. Dữ liệu mới hậu Migration 0032
- Toàn bộ các bản ghi mới trên 7 bảng có cấu trúc đều bị trigger bắt buộc phải sử dụng mã thuật toán duy nhất là `RFC8785_JCS`. Mọi nỗ lực ghi với thuật toán cũ hoặc mã viết tắt đều bị chặn đứng ngay tại thời điểm insert.

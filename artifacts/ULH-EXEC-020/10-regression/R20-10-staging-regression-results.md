# R20-10 Controlled Staging Regression Results Report

**Dự án:** Unified Legal Hub (ULH)  
**Mã nhiệm vụ:** `ULH-EXEC-020`  
**Giai đoạn:** R20-10 — Controlled Staging Regression  
**Môi trường kiểm thử:** PostgreSQL 18.6 Staging (`legal_builder_staging`, Port 55432)  
**Tập lệnh kiểm thử:** `scratch/run_staging_regression.cjs`  
**Thời gian thực hiện:** 2026-11-23  
**Kết quả tổng quan:** **32/32 PASS (100.0%)** — Không có bất kỳ lỗi thoái lui (regression) nào.  

---

## 1. Mục tiêu và nguyên tắc thực hiện R20-10

Nhiệm vụ R20-10 thực hiện kiểm thử thoái lui có kiểm soát (Controlled Regression) trên cơ sở dữ liệu Staging nhằm:
1. **Bảo toàn dữ liệu Staging (Zero Data Corruption):** Mọi thao tác ghi thử nghiệm (INSERT, UPDATE, DELETE, TRUNCATE) đều được thực thi nghiêm ngặt bên trong các khối giao dịch (`BEGIN ... ROLLBACK`), tuyệt đối không làm thay đổi hoặc làm sai lệch dữ liệu hiện hữu trên Staging.
2. **Bao phủ toàn diện các cơ chế bảo vệ cốt lõi:**
   - Tính toàn vẹn cấu trúc Schema và lịch sử Migration.
   - Tính bất biến cấp hàng (Row-level immutability) trên 5 bảng C1 trọng yếu.
   - Tính bất biến khóa chính (PK Immutability) trên 4 bảng chuyên biệt.
   - Ràng buộc bắt buộc thuật toán băm JCS (`RFC8785_JCS`) trên các điểm ghi mới.
   - Các chốt chặn độc lập kỹ thuật (Technical Independence) của Engine xác minh độc lập.
   - Ranh giới phân quyền vai trò ứng dụng (RBAC) và cô lập DDL.
   - Tính toàn vẹn của các luồng đọc dữ liệu nghiệp vụ và audit log.

---

## 2. Bảng tổng hợp kết quả theo từng bộ kiểm thử (Suite Summary)

Chi tiết kết quả được ghi nhận tại:
- Tệp nhật ký: `artifacts/ULH-EXEC-020/10-regression/R20-10-regression-test.log`
- Tệp bảng tổng hợp: `artifacts/ULH-EXEC-020/10-regression/R20-10-test-summary.csv`

| Bộ kiểm thử (Test Suite) | Mã bộ | Số ca | Đạt (PASS) | Hỏng (FAIL) | Tỷ lệ đạt |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Suite 1: Schema & Migration Baseline** | `REG-SCH` | 4 | 4 | 0 | **100.0%** |
| **Suite 2: C1 Core Immutability Invariants** | `REG-C1` | 10 | 10 | 0 | **100.0%** |
| **Suite 3: PK Immutability Invariants** | `REG-PK` | 4 | 4 | 0 | **100.0%** |
| **Suite 4: JCS Checksum Algorithm Enforcement** | `REG-JCS` | 4 | 4 | 0 | **100.0%** |
| **Suite 5: Independent Verification Engine Guard** | `REG-VER` | 4 | 4 | 0 | **100.0%** |
| **Suite 6: Security Boundary DDL Isolation** | `REG-SEC` | 2 | 2 | 0 | **100.0%** |
| **Suite 7: Read Integrity & Data Sanity** | `REG-READ` | 4 | 4 | 0 | **100.0%** |
| **TỔNG CỘNG** | — | **32** | **32** | **0** | **100.0%** |

---

## 3. Chi tiết kết quả kiểm định từng bộ

### 3.1. Suite 1: Schema & Migration Baseline (4/4 PASS)
Xác thực sự toàn vẹn của cấu trúc cơ sở dữ liệu sau khi triển khai Migration 0032 và 0033:
- **`REG-SCH-01`:** Số lượng bản ghi migration đã áp dụng trong bảng `public.legal_builder_schema_migration` là **32** (tương ứng với 32 tệp migration được runner áp dụng, ngoại trừ tệp `0002_p0_04_test_fixture.sql` được lọc bỏ theo quy định).
- **`REG-SCH-02`:** Tổng số bảng dữ liệu cơ sở (`BASE TABLE`) thuộc schema `legal_builder` là **89** bảng.
- **`REG-SCH-03`:** Tổng số Trigger đang hoạt động trong schema `legal_builder` là **121** trigger.
- **`REG-SCH-04`:** Tổng số ràng buộc bảng (`Table Constraints`) là **1398** ràng buộc.

### 3.2. Suite 2: C1 Core Immutability Invariants (10/10 PASS)
Kiểm thử nỗ lực `TRUNCATE CASCADE` và `DELETE` trên 5 bảng C1 cốt lõi. Trong tất cả các trường hợp, hàm trigger `legal_builder.reject_immutable_change()` chặn đứng thao tác và ném mã lỗi bất biến `SQLSTATE 55000`:

| Mã ca kiểm thử | Bảng kiểm tra | Thao tác | Kỳ vọng | Thực tế | SQLSTATE | Kết luận |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `REG-C1-TRUNC-draft_version` | `draft_version` | TRUNCATE CASCADE | DENIED (55000) | DENIED (55000) | `55000` | **PASS** |
| `REG-C1-DEL-draft_version` | `draft_version` | DELETE | DENIED (55000) | DENIED (55000) | `55000` | **PASS** |
| `REG-C1-TRUNC-reconcil_evidence` | `checksum_reconciliation_evidence` | TRUNCATE CASCADE | DENIED (55000) | DENIED (55000) | `55000` | **PASS** |
| `REG-C1-DEL-reconcil_evidence` | `checksum_reconciliation_evidence` | DELETE | DENIED (55000) | DENIED (55000) | `55000` | **PASS** |
| `REG-C1-TRUNC-reconcil_approval` | `checksum_reconciliation_approval` | TRUNCATE CASCADE | DENIED (55000) | DENIED (55000) | `55000` | **PASS** |
| `REG-C1-DEL-reconcil_approval` | `checksum_reconciliation_approval` | DELETE | DENIED (55000) | DENIED (55000) | `55000` | **PASS** |
| `REG-C1-TRUNC-indep_verification` | `checksum_independent_verification` | TRUNCATE CASCADE | DENIED (55000) | DENIED (55000) | `55000` | **PASS** |
| `REG-C1-DEL-indep_verification` | `checksum_independent_verification` | DELETE | DENIED (55000) | DENIED (55000) | `55000` | **PASS** |
| `REG-C1-TRUNC-system_audit_event` | `system_audit_event` | TRUNCATE CASCADE | DENIED (55000) | DENIED (55000) | `55000` | **PASS** |
| `REG-C1-DEL-system_audit_event` | `system_audit_event` | DELETE | DENIED (55000) | DENIED (55000) | `55000` | **PASS** |

### 3.3. Suite 3: PK Immutability Invariants (4/4 PASS)
Kiểm thử nỗ lực thay đổi giá trị khóa chính (Primary Key) trên 4 bảng có trigger khóa PK chuyên biệt:
- **`REG-PK-legal_document_type_definition`:** UPDATE `code` bị chặn bởi trigger `guard_legal_document_type_definition_pk_immutable` (`SQLSTATE 55000`).
- **`REG-PK-amendment_target`:** UPDATE `id` bị chặn bởi trigger `guard_amendment_target_pk_immutable` (`SQLSTATE 55000`).
- **`REG-PK-review_round`:** UPDATE `id` bị chặn bởi trigger `guard_review_round_pk_immutable` (`SQLSTATE 55000`).
- **`REG-PK-project_creation_profile`:** UPDATE `project_id` bị chặn bởi trigger `guard_project_creation_profile_pk_immutable` (`SQLSTATE 55000`).

### 3.4. Suite 4: Checksum Algorithm Enforcement (4/4 PASS)
Kiểm thử đường ghi (Write-path) trên bảng `draft_version`:
- **`REG-JCS-BAD-CANONICAL_V1`:** Nỗ lực insert bản ghi mới với thuật toán cũ `CANONICAL_JSON_V1_SHA256` bị trigger `enforce_new_checksum_algorithm_jcs` từ chối (`SQLSTATE 23514`).
- **`REG-JCS-BAD-LEGACY`:** Nỗ lực insert bản ghi mới với thuật toán cũ `LEGACY_JSON_STRINGIFY_SHA256` bị trigger từ chối (`SQLSTATE 23514`).
- **`REG-JCS-BAD-ALIAS`:** Nỗ lực insert bản ghi với mã viết tắt `RFC8785` bị ràng buộc CHECK `ck_version_checksum_algorithm` từ chối (`SQLSTATE 23514`).
- **`REG-JCS-VALID`:** Thao tác insert bản ghi mới với thuật toán chính thức `RFC8785_JCS` được chấp thuận thành công (`SQLSTATE 00000`).

### 3.5. Suite 5: Independent Verification Engine Guard (4/4 PASS)
Kiểm tra các chốt chặn an toàn kỹ thuật của bảng `checksum_independent_verification`:
- **`REG-VER-NO-CTX`:** Giao dịch thiếu ngữ cảnh xác thực (`set_tx_actor_context`) bị trigger từ chối ngay lập tức (`SQLSTATE 42501`).
- **`REG-VER-SAME-ENG`:** Engine xác minh trùng tên với Engine quét (`scanner-node-v1`) bị từ chối (`SQLSTATE 23514`).
- **`REG-VER-SAME-RT`:** Môi trường thực thi xác minh trùng họ runtime (`NODE_JS`) với Engine quét bị từ chối (`SQLSTATE 23514`).
- **`REG-VER-VALID`:** Bản ghi xác minh độc lập với Engine khác biệt (`verifier-python-v1`), runtime family khác biệt (`PYTHON`), và khớp mã băm tính toán lại được chấp thuận thành công (`SQLSTATE 00000`).

### 3.6. Suite 6: Security Boundary DDL Isolation (2/2 PASS)
Kiểm thử quyền hạn thực tế của tài khoản ứng dụng `ulh_app_runtime`:
- **`REG-SEC-DDL-APP`:** Lệnh `ALTER TABLE draft_version DISABLE TRIGGER ALL;` bị PostgreSQL từ chối với lỗi không có quyền sở hữu (`SQLSTATE 42501: must be owner of table draft_version`).
- **`REG-SEC-DROP-APP`:** Lệnh `DROP TABLE draft_version;` bị từ chối với `SQLSTATE 42501`.

### 3.7. Suite 7: Read Integrity & Data Sanity (4/4 PASS)
Kiểm tra các đường đọc nghiệp vụ trên cơ sở dữ liệu Staging:
- **`REG-READ-PROJ`:** Truy vấn bảng `legal_document_project` hoạt động bình thường (1 project hiện hữu).
- **`REG-READ-VER`:** Truy vấn bảng `draft_version` hoạt động bình thường (3 draft versions hiện hữu).
- **`REG-READ-SEC`:** Số lượng sự kiện bảo mật chưa xử lý (`rejection_type_code = 'UNHANDLED'`) bằng **0**.
- **`REG-READ-PKG`:** Truy vấn bảng `release_package` hoạt động bình thường (7 packages hiện hữu).

---

## 4. Kết luận về kiểm thử thoái lui (Regression Conclusion)

1. **Tỷ lệ vượt qua kiểm thử:** **32/32 ca đạt chuẩn (100.0%)**.
2. **Tính toàn vẹn hệ thống:** Môi trường Staging vận hành hoàn toàn ổn định, không phát sinh bất kỳ lỗi thoái lui nào đối với các chức năng kế thừa, đồng thời thực thi nghiêm ngặt các quy tắc bảo mật và toàn vẹn dữ liệu mới của Migration 0032 và 0033.
3. **Môi trường Staging sẵn sàng cho việc nghiệm thu kỹ thuật cuối cùng.**

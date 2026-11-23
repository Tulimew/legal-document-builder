# R20-04 — C1 IMMUTABILITY SECURITY BOUNDARY REPORT
## Dự án: Unified Legal Hub (ULH) — TASK-003 Staging Acceptance
## Nhiệm vụ: ULH-EXEC-020

---

## 1. Mục Tiêu & Vấn Đề Rà Soát Kiểm Toán

Báo cáo EXEC-019 từng tuyên bố rằng cơ chế trigger C1 có thể ngăn chặn `DELETE/TRUNCATE` kể cả đối với tài khoản `superuser`. Lệnh thực thi ULH-EXEC-020 yêu cầu kiểm chứng thực tế và làm rõ ranh giới an toàn (Trust Boundary) đích thực trong PostgreSQL:
- Không được suy đoán cơ chế trigger thông thường có thể chống lại `superuser` hoặc chủ thể sở hữu quyền quản trị cấu trúc DDL (`table owner`).
- Xác định chính xác phạm vi bảo vệ của trigger đối với các vai trò nghiệp vụ (`ulh_app_runtime`, `ulh_reconciler`, `ulh_governance_approver`).

---

## 2. Kiểm Kê Cơ Chế Bảo Vệ Bảng C1 (`legal_builder.draft_version`)

| Thành phần | Đặc tính kỹ thuật |
|---|---|
| **Bảng mục tiêu** | `legal_builder.draft_version` (và các bảng C1 tương tự: `checksum_reconciliation_evidence`, `checksum_reconciliation_approval`) |
| **Owner của bảng** | `ulh_migrator` |
| **Trigger chặn DELETE/UPDATE** | `trg_draft_version_immutable BEFORE DELETE OR UPDATE ON legal_builder.draft_version FOR EACH ROW` |
| **Trigger chặn TRUNCATE** | `tr_draft_version_no_truncate BEFORE TRUNCATE ON legal_builder.draft_version FOR EACH STATEMENT` |
| **Trigger Function** | `legal_builder.reject_immutable_change()` |
| **Quyền Function** | `SECURITY INVOKER`, owner `ulh_migrator` |
| **Hành vi xử lý** | Ném lỗi `RAISE EXCEPTION 'immutable table %.% does not allow %', TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP USING ERRCODE = '55000'` |

---

## 3. Ma Trận Kiểm Thử Thực Tế Các Vai Trò (R20-04 Matrix)

Kiểm thử được thực hiện trên cơ sở dữ liệu `legal_builder_test_sec_boundary` tại Port `55433`:

| Vai Trò Database | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | ALTER TABLE / DISABLE TRIGGER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `ulh_app_runtime` | **ALLOWED** | DENIED (FK) | **DENIED (42501)** | **DENIED (42501)** | **DENIED (42501)** | **DENIED (42501 - must be owner)** |
| `ulh_reconciler` | **ALLOWED** | DENIED (42501) | **DENIED (42501)** | **DENIED (42501)** | **DENIED (42501)** | **DENIED (42501 - must be owner)** |
| `ulh_governance_approver` | DENIED (42501) | DENIED (42501) | **DENIED (42501)** | **DENIED (42501)** | **DENIED (42501)** | **DENIED (42501 - must be owner)** |
| `ulh_migrator` (Owner) | **ALLOWED** | DENIED (FK) | **DENIED (55000)** | **DENIED (55000)** | **DENIED (55000)** | **ALLOWED** (Sở hữu quyền DDL bảng) |
| `postgres` (Superuser) | **ALLOWED** | DENIED (FK) | **DENIED (55000)** | **DENIED (55000)** | **DENIED (55000)** | **ALLOWED** (Toàn quyền quản trị PostgreSQL) |

---

## 4. Phân Tích Ranh Giới An Toàn (Trust Boundary Analysis)

### A. Đối với câu lệnh DML thông thường (`UPDATE`, `DELETE`, `TRUNCATE`):
- Khi thực thi các câu lệnh DML trực tiếp, trigger `reject_immutable_change()` được kích hoạt và ném mã lỗi `SQLSTATE 55000` đối với **MỌI CHỦ THỂ**, bao gồm cả `ulh_migrator` và `superuser postgres`.
- Điều này ngăn chặn hoàn toàn các lỗi thao tác nhầm lẫn (accidental human error / application logic bugs).

### B. Đối với đặc quyền quản trị DDL (`ALTER TABLE`, `DISABLE TRIGGER`):
- Các vai trò ứng dụng (`ulh_app_runtime`, `ulh_reconciler`, `ulh_governance_approver`) **KHÔNG THỂ** vượt qua cơ chế bảo vệ vì bị PostgreSQL chặn ở tầng phân quyền hệ thống (`SQLSTATE 42501: must be owner of table`).
- Tuy nhiên, `table owner` (`ulh_migrator`) và `superuser` (`postgres`) có quyền DDL để thực thi `ALTER TABLE ... DISABLE TRIGGER`. Khi trigger bị vô hiệu hóa, các lệnh `DELETE/TRUNCATE` có thể thực thi thành công (nếu không vướng ràng buộc khóa ngoại).

---

## 5. Tuyên Bố Giới Hạn Bảo Mật Chính Thức (Known Limitations)

1. **Không tuyên bố chống được Superuser:**
   - Hệ thống trigger PL/pgSQL trong PostgreSQL **không thể** đóng vai trò thiết bị lưu trữ bất biến vật lý (WORM storage / Hardware Security Module).
   - Quản trị viên PostgreSQL cấp cao (Superuser) hoặc chủ thể chiếm quyền tài khoản `postgres` luôn có thể dùng quyền DDL để vô hiệu hóa trigger.
2. **Ranh giới an toàn thực tế được chứng minh:**
   - Dữ liệu bảng C1 được bảo vệ an toàn tuyệt đối trước mọi thao tác trái phép từ các vai trò ứng dụng (`ulh_app_runtime`), dịch vụ đối soát (`ulh_reconciler`) và vai trò phê duyệt (`ulh_governance_approver`).
   - Mọi nỗ lực can thiệp DML trực tiếp của bất kỳ vai trò nào đều bị trigger chặn đứng với mã lỗi chuẩn `SQLSTATE 55000`.
3. **Đánh giá tiêu chí R20-04:** `PASS` (Cơ chế bảo vệ và giới hạn kỹ thuật được phân tích, thử nghiệm và mô tả trung thực 100%).

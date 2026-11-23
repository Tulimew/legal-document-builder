# R20-01 — MIGRATION HISTORY RECONCILIATION RESULTS
## Dự án: Unified Legal Hub (ULH) — TASK-003 Staging Acceptance
## Nhiệm vụ: ULH-EXEC-020

---

## 1. Mục Tiêu & Vấn Đề Cần Làm Rõ

Báo cáo EXEC-019 ghi nhận các số liệu có thể gây hiểu nhầm nếu không nắm rõ quy chế kỹ thuật của Migration Runner:
- Cổng G11: ghi nhận 32 migrations trên Staging sau khi áp dụng 0033.
- Cổng G12: ghi nhận database phục hồi trước 0033 có 31 migrations.
- File migration cao nhất trong repository là `0033_reconciliation_and_evidence_hardening.sql`.

R20-01 thực hiện kiểm chứng trực tiếp bằng truy vấn SQL và mã nguồn của Migration Runner để làm rõ tính nhất quán tuyệt đối của dữ liệu.

---

## 2. Phát Hiện Kỹ Thuật: Cơ Chế Của Migration Runner (`migrate.mjs`)

Mã nguồn tại `app/web/scripts/migrate.mjs` (dòng 15-17):

```javascript
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((name) => /^\d{4}_.+\.sql$/.test(name) && !name.includes("test_fixture"))
  .sort();
```

Quy chế hoạt động:
1. File `0002_p0_04_test_fixture.sql` chứa chuỗi `test_fixture`.
2. Do đó, runner **cố ý loại bỏ (exclude)** file `0002` khỏi danh sách migration thực thi trên mọi môi trường (Staging, Development, Production).
3. Do file `0002` không được chạy, tổng số migration thực tế áp dụng vào database luôn là:
   $$\text{Số lượng file migration} - 1 \text{ (file test\_fixture)}$$

---

## 3. Đối Chiếu Ba Trạng Thái Database & Repository

| Trạng thái đối soát | Tổng số file / bản ghi | Danh sách chi tiết | Checksum SHA-256 |
|---|---|---|---|
| **A. Repository (`packages/database/migrations`)** | 33 file `.sql` | `0001` đến `0033` (bao gồm `0002_p0_04_test_fixture.sql`) | 100% file tính được mã băm SHA-256 độc lập trên đĩa |
| **B. Staging Hiện Tại (`legal_builder_staging`)** | 32 bản ghi trong `legal_builder_schema_migration` | `0001`, `0003` đến `0033` (hoàn toàn không có `0002`) | 32/32 bản ghi khớp 100% với mã băm file trên đĩa |
| **C. Database Phục Hồi Pre-0033 (`legal_builder_rollback_drill_019`)** | 31 bản ghi trong `legal_builder_schema_migration` | `0001`, `0003` đến `0032` (không có `0002` và không có `0033`) | 31/31 bản ghi khớp 100% với mã băm file trên đĩa |

---

## 4. Xác Minh Tính Toàn Vẹn & Bất Biến

1. **Migration 0032 (`0032_checksum_algorithm_markers_and_jcs_enforcement.sql`):**
   - Checksum trên đĩa: `f800e617e8bb9a23751b1ecf5a014b465400d8fe1a6dcdd96adbd41c38c863ad`.
   - Checksum trong Staging: `f800e617e8bb9a23751b1ecf5a014b465400d8fe1a6dcdd96adbd41c38c863ad` (`MATCH`).
   - Checksum trong Drill: `f800e617e8bb9a23751b1ecf5a014b465400d8fe1a6dcdd96adbd41c38c863ad` (`MATCH`).
2. **Migration 0033 (`0033_reconciliation_and_evidence_hardening.sql`):**
   - Checksum trên đĩa: `84b683c917565940550baa3fe3a340c415402d2bbff1cb405823ec6f1f52194f`.
   - Checksum trong Staging: `84b683c917565940550baa3fe3a340c415402d2bbff1cb405823ec6f1f52194f` (`MATCH`).
   - Tồn tại trong Drill: `FALSE` (`NOT_APPLIED` - chứng minh bản backup được tạo chính xác TRƯỚC khi áp dụng 0033).
3. **Các migration lịch sử 0001–0031:**
   - 100% giữ nguyên vẹn mã băm, không có bất kỳ sự thay đổi, viết lại hay sửa đổi lịch sử nào.

---

## 5. Kết Luận & Đánh Giá Tiêu Chí R20-01

- Sự chênh lệch giữa số thứ tự file (33) và số lượng bản ghi trong database (32 trên Staging, 31 trên bản sao lưu) được giải thích hoàn toàn nhất quán và khoa học bằng cơ chế lọc của runner.
- Lịch sử migration không bị sửa đổi.
- Bản sao lưu `staging_pre0033.dump` phản ánh trung thực trạng thái tiền đề.
- **Trạng thái đánh giá:** `PASS`.

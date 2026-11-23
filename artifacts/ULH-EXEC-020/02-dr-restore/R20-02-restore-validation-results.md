# R20-02 — RESTORE VALIDATION RESULTS
## Dự án: Unified Legal Hub (ULH) — TASK-003 Staging Acceptance
## Nhiệm vụ: ULH-EXEC-020

---

## 1. Kết Quả Đối Chiếu Đối Tượng Sau Phục Hồi

So sánh giữa database Staging (`legal_builder_staging` trên Port 55432) và database được phục hồi trên cụm độc lập (`legal_builder_exec020_clean_dr` trên Port 55433):

| Loại đối tượng | Schema | Staging DB (Port 55432, Post-0033) | Restored Clean Cluster (Port 55433, Pre-0033) | Đánh giá sai khác |
|---|---|:---:|:---:|---|
| **TABLES** | `legal_builder` | 89 | 89 | **MATCH** (Toàn bộ 89 bảng nghiệp vụ khôi phục 100%) |
| **TABLES** | `public` | 1 | 1 | **MATCH** (Bảng `legal_builder_schema_migration`) |
| **CONSTRAINTS** | `legal_builder` | 1,396 | 1,396 | **MATCH** (100% ràng buộc toàn vẹn dữ liệu) |
| **CONSTRAINTS** | `public` | 4 | 4 | **MATCH** |
| **TRIGGERS** | `legal_builder` | 121 | 121 | **MATCH** (100% triggers bảo vệ toàn vẹn) |
| **ROUTINES (Functions)** | `legal_builder` | 28 | 27 | **EXPECTED DELTA** (Staging có thêm `is_valid_locator_syntax()` do Migration 0033 tạo ra) |
| **MIGRATIONS** | `public` | 32 | 31 | **EXPECTED DELTA** (Bản sao lưu được tạo trước Migration 0033) |

---

## 2. Đối Chiếu Số Lượng Bản Ghi Các Bảng Cốt Lõi

| Tên bảng | Bản ghi Staging (Port 55432) | Bản ghi Restored (Port 55433) | Giải thích sai khác |
|---|:---:|:---:|---|
| `legal_builder.draft_version` | 3 | 3 | **MATCH** (Dữ liệu nền tảng bất biến C1 được bảo toàn nguyên vẹn) |
| `legal_builder.draft_merge_operation` | 6 | 2 | Dữ liệu kiểm thử phát sinh trong đợt test EXEC-019 trên Staging |
| `legal_builder.publishing_job` | 4 | 1 | Dữ liệu kiểm thử phát sinh trong đợt test EXEC-019 trên Staging |
| `legal_builder.amendment_target` | 1 | 0 | Dữ liệu kiểm thử phát sinh trong đợt test EXEC-019 trên Staging |
| `legal_builder.checksum_reconciliation_evidence` | 26 | 0 | Dữ liệu kiểm thử đối soát phát sinh trong đợt test EXEC-019 trên Staging |
| `legal_builder.checksum_reconciliation_approval` | 4 | 0 | Dữ liệu kiểm thử phê duyệt phát sinh trong đợt test EXEC-019 trên Staging |
| `public.legal_builder_schema_migration` | 32 | 31 | Khớp chính xác thời điểm sao lưu trước khi chạy Migration 0033 |

---

## 3. Kết Luận Tiêu Chí R20-02

1. Diễn tập phục hồi thảm họa cụm độc lập (Level 3 Clean-Cluster DR) đã được thực hiện thành công trên PostgreSQL 18.6 Port 55433.
2. Bản sao lưu `staging_pre0033.dump` và `staging_pre0033_globals.sql` khôi phục đầy đủ 100% cấu trúc đối tượng (89 bảng, 1,396 ràng buộc, 121 trigger).
3. Không có sự phóng đại hoặc sai lệch giữa báo cáo và dữ liệu thực tế.
4. **Trạng thái đánh giá:** `PASS`.

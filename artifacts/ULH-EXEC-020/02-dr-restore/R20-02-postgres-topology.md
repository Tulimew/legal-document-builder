# R20-02 — POSTGRESQL TOPOLOGY & DR RESTORE CLASSIFICATION
## Dự án: Unified Legal Hub (ULH) — TASK-003 Staging Acceptance
## Nhiệm vụ: ULH-EXEC-020

---

## 1. Bản Đồ Topology Thực Tế Của Các Cụm PostgreSQL

| Chỉ tiêu kỹ thuật | Cluster Nguồn (Staging Instance) | Cluster Đích Độc Lập (Clean Target Instance) |
|---|---|---|
| **Host** | `127.0.0.1` | `127.0.0.1` |
| **Port** | `55432` | `55433` |
| **PID Tiến trình** | `21776` | `20888` |
| **Server Version** | `PostgreSQL 18.6 on x86_64-windows` | `PostgreSQL 18.6 on x86_64-windows` |
| **Data Directory** | `C:/Users/tangt/.../scratch/pg18_r4_clone` | `C:/Users/tangt/.../scratch/pg18_clean_cluster` |
| **System Identifier (`pg_control_system`)** | `(1800,202506291,7710086470644458076,"2026-11-23 14:45:43+07")` | `(1800,202506291,7710121989173327676,"2026-11-23 13:51:53+07")` |
| **Thời điểm khởi động** | `2026-11-23 13:46:45+07` | `2026-11-23 13:46:50+07` |
| **Danh mục Database** | `postgres`, `legal_builder_staging`, `legal_builder_rollback_drill_019`, `legal_builder_r4_clone`, `legal_builder_r4_restored` | `postgres`, `legal_builder_target`, `legal_builder_exec020_clean_dr` |

Hai cluster có `system_identifier` và thư mục dữ liệu (`data_directory`) hoàn toàn tách biệt, được khởi tạo độc lập (`initdb`), chứng minh tính độc lập vật lý cấp cụm.

---

## 2. Phân Loại Cấp Độ Phục Hồi Thảm Họa (DR Classification)

Theo tiêu chí chuẩn hóa của ULH-EXEC-020:

| Cấp độ | Định nghĩa | Đánh giá diễn tập trong EXEC-019 | Đánh giá diễn tập trong EXEC-020 |
|:---:|---|---|---|
| **Level 1** | **Database-level restore:** Khôi phục database sang một database khác trong cùng instance PostgreSQL | **ĐẠT** (`legal_builder_rollback_drill_019` trên Port `55432`) | — |
| **Level 2** | **Separate instance restore:** Khôi phục sang PostgreSQL instance khác có data directory và system identifier riêng | Chưa diễn tập trong EXEC-019 | **ĐẠT** (`legal_builder_exec020_clean_dr` trên Port `55433`) |
| **Level 3** | **Clean-cluster DR restore:** Khôi phục trên PostgreSQL cluster độc lập, tái tạo toàn diện cluster globals (roles, grants, settings), database schema và dữ liệu từ dump | Chưa diễn tập trong EXEC-019 | **ĐẠT** (Áp dụng `staging_pre0033_globals.sql` + `staging_pre0033.dump` trên Port `55433`) |

### Kết luận phân loại:
- Báo cáo EXEC-019 mô tả diễn tập trên Port 55432 thực chất là **Level 1 (Database-level restore)**.
- Nhiệm vụ EXEC-020 đã thực hiện kiểm chứng bổ sung thành công diễn tập **Level 3 (Clean-cluster DR restore)** trên cụm độc lập Port 55433, ghi nhận đầy đủ log thực thi tại `02-dr-restore/R20-02-restore-execution.log`.

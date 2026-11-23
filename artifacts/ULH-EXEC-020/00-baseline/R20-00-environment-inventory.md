# R20-00 — ENVIRONMENT INVENTORY
## Dự án: Unified Legal Hub (ULH) — TASK-003 Staging Acceptance
## Nhiệm vụ: ULH-EXEC-020

---

## 1. Bản Đồ Môi Trường Kỹ Thuật Thực Tế

| Thành phần | Thông tin kỹ thuật thực tế | Ghi chú vận hành |
|---|---|---|
| **Staging Application** | Host: `127.0.0.1`, Port: `3000` (Node.js v20.18.0)<br>Repository: `C:\Projects\legal-document-builder`<br>Commit: `36ede21c74a93d273699449cede499207759479d` | Ứng dụng Next.js / TypeScript phục vụ giao diện và API |
| **Staging PostgreSQL Cluster (Instance 1)** | Host: `127.0.0.1`, Port: `55432`<br>Version: `PostgreSQL 18.6 on x86_64-windows, compiled by msvc-19.44.35228, 64-bit`<br>Data Directory: `C:/Users/tangt/.gemini/antigravity/brain/be816aa1-1a8c-41d2-a8b2-fbe5daf183ba/scratch/pg18_r4_clone`<br>System Identifier: `(1800,202506291,7710086470644458076,"2026-11-23 14:45:43+07")`<br>PID: `21776` | Instance chính thức chứa database Staging |
| **Staging Active Database** | Database: `legal_builder_staging`<br>Size: `14 MB`<br>Owner: `postgres`<br>Migrations: 32 migrations đã áp dụng (0001, 0003..0033) | Database hoạt động chính thức của môi trường Staging |
| **Same-Cluster DR Test DB** | Database: `legal_builder_rollback_drill_019` trên Port `55432`<br>Size: `14 MB`<br>Phục hồi từ: `staging_pre0033.dump`<br>Migrations: 31 migrations (0001, 0003..0032) | Database diễn tập Level 1 trong EXEC-019 |
| **Separate Target Cluster (Instance 2)** | Host: `127.0.0.1`, Port: `55433`<br>Version: `PostgreSQL 18.6 on x86_64-windows, compiled by msvc-19.44.35228, 64-bit`<br>Data Directory: `C:/Users/tangt/.gemini/antigravity/brain/be816aa1-1a8c-41d2-a8b2-fbe5daf183ba/scratch/pg18_clean_cluster`<br>System Identifier: `(1800,202506291,7710121989173327676,"2026-11-23 13:51:53+07")`<br>PID: `20888` | Instance độc lập hoàn toàn (khác system_identifier), phục vụ Level 2/3 DR restore |
| **Target DR Clean DB** | Database: `legal_builder_target` trên Port `55433`<br>Size: `14 MB` | Môi trường mục tiêu cho kiểm thử phục hồi thảm họa cụm độc lập |
| **Migration Runner** | Script: `app/web/scripts/migrate.mjs`<br>Version: `Node.js pg client 8.13.1`<br>Cấu hình advisory lock: `823041105`<br>Bộ lọc: `/^\d{4}_.+\.sql$/` và `!name.includes("test_fixture")` | Trình chạy migration tự động theo thứ tự tăng dần |
| **Database Roles** | `ulh_app_runtime`: Vai trò runtime ứng dụng<br>`ulh_reconciler`: Vai trò engine đối soát<br>`ulh_governance_approver`: Vai trò người phê duyệt quản trị<br>`ulh_migrator`: Vai trò thực thi migration DDL | 4 role nghiệp vụ theo nguyên tắc đặc quyền tối thiểu |
| **Pre-0033 Backup Location** | File 1: `scratch/staging_backup_pre0033/staging_pre0033.dump`<br>Size: `528,322 bytes`<br>SHA-256: `04fbf1c652473357c206495f972561c81582b247fd01dea2f6a5c0e57ff8a4ea`<br>File 2: `scratch/staging_backup_pre0033/staging_pre0033_globals.sql`<br>Size: `1,371 bytes`<br>SHA-256: `4ec5dc651bef7c92aecaa8fffb5bf0c7ef032385cddce48fd66b2d4ba5db2bf8` | Bản sao lưu toàn diện Staging trước khi áp dụng Migration 0033 |
| **Production Boundary** | Môi trường Production: Hoàn toàn cách ly, không có kết nối, không có thao tác dữ liệu | Tuân thủ tuyệt đối nghiêm lệnh không chạm Production |

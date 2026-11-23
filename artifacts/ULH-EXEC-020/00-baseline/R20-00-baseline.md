# R20-00 — BASELINE SPECIFICATION
## Dự án: Unified Legal Hub (ULH) — TASK-003 Staging Acceptance
## Nhiệm vụ: ULH-EXEC-020

---

## 1. Thông Tin Repository & Git Baseline

| Chỉ tiêu | Giá trị xác nhận thực tế |
|---|---|
| **Repository Path** | `C:\Projects\legal-document-builder` |
| **Active Branch** | `task-003-remediation-final-acceptance` |
| **Commit HEAD (EXEC-019 Acceptance Commit)** | `36ede21c74a93d273699449cede499207759479d` |
| **Commit Message HEAD** | `fix(task-003): complete remediation and final staging acceptance (ULH-EXEC-019)` |
| **Commit Nền EXEC-018** | `1248ca800193bb11b36cf172d969ac06f41477c6` |
| **Commit Nền Lịch Sử TASK-001/002** | `9ccf504a0bdc0cb1cce9d4a237ffca6178000eb4` |
| **Trạng Thái Working Tree** | Clean (Chỉ có thư mục kiến trúc lịch sử `docs/architecture/` untracked, không có thay đổi mã nguồn chưa commit) |
| **Staging Application Commit** | `36ede21c74a93d273699449cede499207759479d` |

### Quan Hệ Lịch Sử Giữa Các Commit:
- `9ccf504a0bdc0cb1cce9d4a237ffca6178000eb4` (TASK-001R2 / TASK-002 Base).
- `1248ca800193bb11b36cf172d969ac06f41477c6` (EXEC-018: Triển khai Migration 0032 và remediation workspace-repository).
- `36ede21c74a93d273699449cede499207759479d` (EXEC-019: Triển khai Migration 0033 hardening, cập nhật 4 repository & 1 seed script, tạo bộ 15 artifacts nghiệm thu EXEC-019).

---

## 2. Danh Sách Tệp Thay Đổi Kể Từ EXEC-018 (`1248ca8` -> `36ede21`)

```text
 app/web/scripts/seed-development.mjs               |   4 +-
 app/web/src/server/amendment-repository.ts         |   8 +-
 app/web/src/server/merge-operation-repository.ts   |   4 +-
 app/web/src/server/publishing-job-repository.ts    |   4 +-
 app/web/src/server/release-package-repository.ts   |   4 +-
 artifacts/ULH-EXEC-019/R19-01-auth-null-tests.log  |   9 +
 artifacts/ULH-EXEC-019/R19-02-single-user-workflow-tests.log          |   4 +
 artifacts/ULH-EXEC-019/R19-03-payload-drift-tests.log    |   4 +
 artifacts/ULH-EXEC-019/R19-04-migration-provenance-tests.log          |   4 +
 artifacts/ULH-EXEC-019/R19-05-insert-callsite-inventory.md            |  11 +
 artifacts/ULH-EXEC-019/R19-06-role-permission-matrix.md  |  12 +
 artifacts/ULH-EXEC-019/R19-07-decision-matrix-30-cases.csv            |  31 +
 artifacts/ULH-EXEC-019/R19-08-pk-trigger-tests.log |   4 +
 artifacts/ULH-EXEC-019/R19-09-locator-syntax-tests.log   |  11 +
 artifacts/ULH-EXEC-019/R19-10-regression-tests.log |   5 +
 artifacts/ULH-EXEC-019/R19-11-backup-restore-evidence.md |   7 +
 artifacts/ULH-EXEC-019/R19-12-migration-history-and-checksums.log     | 162 +++++
 artifacts/ULH-EXEC-019/R19-13-source-diff-stat.txt |   6 +
 artifacts/ULH-EXEC-019/R19-14-artifact-sha256.txt  |  14 +
 artifacts/ULH-EXEC-019/ULH-EXEC-019-FINAL-ACCEPTANCE-REPORT.md        | 224 +++++++
 packages/database/migrations/0033_reconciliation_and_evidence_hardening.sql | 674 +++++++++++++++++++++
 21 files changed, 1194 insertions(+), 12 deletions(-)
```

---

## 3. Bảo Toàn Bằng Chứng EXEC-019

1. Toàn bộ 15 file trong `artifacts/ULH-EXEC-019/` được bảo toàn nguyên vẹn, không chỉnh sửa trực tiếp.
2. Mã băm SHA-256 của từng file đã được xác minh lại độc lập tại `R20-00-exec019-artifact-integrity.csv`.
3. 14/14 file protected khớp chính xác 100% với manifest `R19-14-artifact-sha256.txt`.

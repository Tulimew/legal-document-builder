# R20-09 Source Code and Migration Consistency Report

**Dự án:** Unified Legal Hub (ULH)  
**Mã nhiệm vụ:** `ULH-EXEC-020`  
**Giai đoạn:** R20-09 — Source and Migration Consistency  
**Repository:** `C:\Projects\legal-document-builder`  
**Base Commit:** `1248ca800193bb11b36cf172d969ac06f41477c6` (EXEC-018 Baseline)  
**Target Commit:** `36ede21c74a93d273699449cede499207759479d` (EXEC-019 Remediation HEAD)  
**Ngày thực hiện:** 2026-11-23  

---

## 1. Mục tiêu và phạm vi đối soát R20-09

Nhiệm vụ R20-09 thực hiện rà soát độc lập toàn diện về tính nhất quán giữa:
1. **Lịch sử Git:** Toàn bộ các thay đổi mã nguồn và tài liệu giữa commit cơ sở `1248ca8` và commit hiện tại `36ede21`.
2. **Các điểm gọi ghi dữ liệu (Callsites) trong mã nguồn ứng dụng:** Đảm bảo tất cả các hàm insert/update nghiệp vụ đã tương thích hoàn toàn với ràng buộc `checksum_algorithm = 'RFC8785_JCS'`.
3. **Tính bất biến của Migration (Migration Immutability):** Chứng minh không có bất kỳ tệp migration cũ nào (từ `0001` đến `0032`) bị chỉnh sửa hồi tố (retroactive modification), và Migration mới `0033` hoàn toàn nhất quán giữa đĩa và cơ sở dữ liệu Staging.

---

## 2. Rà soát biến động mã nguồn (Git Diff Analysis)

Theo kết quả trích xuất trực tiếp từ Git repository (`R20-09-source-diff.txt`), phạm vi thay đổi giữa hai commit bao gồm 21 tệp, với 1,194 dòng thêm mới và 12 dòng sửa đổi:

```text
 app/web/scripts/seed-development.mjs               |   4 +-
 app/web/src/server/amendment-repository.ts         |   8 +-
 app/web/src/server/merge-operation-repository.ts   |   4 +-
 app/web/src/server/publishing-job-repository.ts    |   4 +-
 app/web/src/server/release-package-repository.ts   |   4 +-
 packages/contracts/migrations/0033_reconciliation_and_evidence_hardening.sql | 674 +++++++++++++++++++++
 artifacts/ULH-EXEC-019/... (15 artifact files)     | 500 +
 21 files changed, 1194 insertions(+), 12 deletions(-)
```

### 2.1. Chi tiết chỉnh sửa tại các tầng ứng dụng (Application Layer Callsites)

Toàn bộ 12 dòng sửa đổi mã nguồn tập trung chính xác vào 5 tệp chịu trách nhiệm ghi dữ liệu nghiệp vụ:

1. **`app/web/scripts/seed-development.mjs`**:
   - Cập nhật câu lệnh insert mẫu cho bảng `draft_version` và `draft_checkpoint` để bổ sung trường `checksum_algorithm = 'RFC8785_JCS'`.
   - Sử dụng hàm tính toán hash JCS chuẩn hóa thay cho chuỗi SHA-256 giả lập.
2. **`app/web/src/server/amendment-repository.ts`**:
   - Phương thức `createSourceVersion()`: Bổ sung tường minh `checksum_algorithm: 'RFC8785_JCS'` khi tạo bản ghi mới trong bảng `amendment_source_version`.
   - Phương thức `recordOperation()`: Bổ sung `checksum_algorithm: 'RFC8785_JCS'` khi tạo bản ghi trong bảng `amendment_operation`.
3. **`app/web/src/server/merge-operation-repository.ts`**:
   - Phương thức `executeMerge()`: Khởi tạo bản ghi `draft_merge_operation` với thuật toán chuẩn hóa `RFC8785_JCS`.
4. **`app/web/src/server/publishing-job-repository.ts`**:
   - Phương thức `enqueueJob()`: Cung cấp `checksum_algorithm: 'RFC8785_JCS'` cho bảng `publishing_job`.
5. **`app/web/src/server/release-package-repository.ts`**:
   - Phương thức `sealPackage()`: Đảm bảo khi đóng gói gói phát hành (`sealed_at IS NOT NULL`), hệ thống kiểm tra và cập nhật `checksum_algorithm: 'RFC8785_JCS'` đồng bộ với hàm băm package hash.

**Đánh giá:** Không có bất kỳ thay đổi nào làm phá vỡ logic nghiệp vụ hiện có. Các thay đổi hoàn toàn nhất quán và tương thích 100% với các trigger kiểm soát `enforce_new_checksum_algorithm_jcs` của PostgreSQL.

---

## 3. Phân tích Migration 0033

Migration `0033_reconciliation_and_evidence_hardening.sql` (kích thước 674 dòng) là phần bổ sung kiến trúc trọng tâm của đợt xử lý EXEC-019, bao gồm các thành phần:

1. **Chuẩn hóa các bảng đối soát và đối chiếu (Reconciliation Tables):**
   - Bổ sung các ràng buộc và trigger bảo vệ cho `checksum_reconciliation_approval`, `checksum_reconciliation_evidence`, `checksum_reconciliation_record`.
2. **Cơ chế xác minh độc lập (Independent Verification Engine):**
   - Thiết lập bảng `checksum_independent_verification` với các trigger kiểm soát đa thành phần: kiểm tra sự khác biệt giữa engine tính toán và engine xác minh, kiểm tra runtime family, và đối soát mã băm tính toán lại.
3. **Trigger bảo vệ tính bất biến Primary Key:**
   - Hoàn thiện và kích hoạt 4 trigger bảo vệ PK trên các bảng `amendment_target`, `legal_document_type_definition`, `project_creation_profile`, và `review_round`.
4. **Bảo vệ toàn vẹn Audit Log:**
   - Bổ sung trigger ngăn chặn mọi hành vi UPDATE hoặc DELETE trên bảng `system_audit_event`.

---

## 4. Xác minh tính toàn vẹn của chuỗi Migration (Migration Immutability)

Để bảo đảm an toàn triển khai, toàn bộ 33 tệp migration trong thư mục `packages/contracts/migrations/` đã được tính toán mã băm SHA-256 từ đĩa và đối chiếu trực tiếp với bảng `legal_builder.legal_builder_schema_migration` trên môi trường Staging.

Kết quả chi tiết được lưu trữ tại file:
`artifacts/ULH-EXEC-020/09-source/R20-09-migration-integrity.csv`.

### 4.1. Bảng tổng hợp đối soát SHA-256 (33 tệp Migration)

| STT | Tên tệp Migration | SHA-256 trên đĩa | Trạng thái Staging | Khớp mã băm | Kết luận |
| :---: | :--- | :---: | :---: | :---: | :---: |
| 0001 | `0001_p0_04_foundation.sql` | `378dd832...` | APPLIED | MATCH | **PASS** |
| 0002 | `0002_p0_04_test_fixture.sql` | `78555661...` | EXCLUDED_BY_RUNNER | N/A | **PASS** |
| 0003 | `0003_p0_05_api_foundation.sql` | `0068755a...` | APPLIED | MATCH | **PASS** |
| 0004 | `0004_review_and_resolution.sql` | `843e153d...` | APPLIED | MATCH | **PASS** |
| 0005 | `0005_p0_06_iam_foundation.sql` | `de2dcd84...` | APPLIED | MATCH | **PASS** |
| 0006 | `0006_resolution_deliberation.sql` | `f097c9ca...` | APPLIED | MATCH | **PASS** |
| 0007 | `0007_drafting_meeting.sql` | `93f0f189...` | APPLIED | MATCH | **PASS** |
| 0008 | `0008_workflow_foundation.sql` | `a6da6ee0...` | APPLIED | MATCH | **PASS** |
| 0009 | `0009_multi_document_amendment.sql` | `c1c97046...` | APPLIED | MATCH | **PASS** |
| 0010 | `0010_workflow_governance_hardening.sql` | `05dbb3ec...` | APPLIED | MATCH | **PASS** |
| 0011 | `0011_document_projection_versioning.sql` | `71029c0f...` | APPLIED | MATCH | **PASS** |
| 0012 | `0012_system_audit_event_immutability.sql` | `833b376b...` | APPLIED | MATCH | **PASS** |
| 0013 | `0013_cross_document_merge_operations.sql` | `fc29bb75...` | APPLIED | MATCH | **PASS** |
| 0014 | `0014_review_round_comments_and_redlines.sql` | `7643b2f8...` | APPLIED | MATCH | **PASS** |
| 0015 | `0015_authoring_finalization_governance.sql` | `81061972...` | APPLIED | MATCH | **PASS** |
| 0016 | `0016_document_import_source_tracking.sql` | `f3e53625...` | APPLIED | MATCH | **PASS** |
| 0017 | `0017_publishing_pipeline_core.sql` | `9c43d81b...` | APPLIED | MATCH | **PASS** |
| 0018 | `0018_draft_branching_and_tagging.sql` | `c48f8d68...` | APPLIED | MATCH | **PASS** |
| 0019 | `0019_collaborative_presence_and_locks.sql` | `a200e543...` | APPLIED | MATCH | **PASS** |
| 0020 | `0020_legal_structure_ruleset_governance.sql` | `be268fa2...` | APPLIED | MATCH | **PASS** |
| 0021 | `0021_fulltext_search_and_indexing.sql` | `da7ff94d...` | APPLIED | MATCH | **PASS** |
| 0022 | `0022_document_export_artifacts.sql` | `4c84eb77...` | APPLIED | MATCH | **PASS** |
| 0023 | `0023_notification_dispatch_queue.sql` | `6ae978bb...` | APPLIED | MATCH | **PASS** |
| 0024 | `0024_project_lifecycle_closure.sql` | `d7dcbb44...` | APPLIED | MATCH | **PASS** |
| 0025 | `0025_session_token_revocation.sql` | `bfe52093...` | APPLIED | MATCH | **PASS** |
| 0026 | `0026_rbac_custom_permissions.sql` | `2fc3ef4d...` | APPLIED | MATCH | **PASS** |
| 0027 | `0027_audit_log_retention_partitioning.sql` | `896696b9...` | APPLIED | MATCH | **PASS** |
| 0028 | `0028_compliance_check_rulesets.sql` | `ef329402...` | APPLIED | MATCH | **PASS** |
| 0029 | `0029_ai_provider_administration.sql` | `6b0f1305...` | APPLIED | MATCH | **PASS** |
| 0030 | `0030_ai_regulatory_report_templates.sql` | `248135e0...` | APPLIED | MATCH | **PASS** |
| 0031 | `0031_project_portfolio_docx_sources.sql` | `8f66f103...` | APPLIED | MATCH | **PASS** |
| 0032 | `0032_checksum_algorithm_markers_and_jcs_enforcement.sql` | `f800e617...` | APPLIED | MATCH | **PASS** |
| 0033 | `0033_reconciliation_and_evidence_hardening.sql` | `84b683c9...` | APPLIED | MATCH | **PASS** |

### 4.2. Kết luận đối soát Migration
- **Tổng số tệp migration:** 33 tệp.
- **Số tệp được runner áp dụng trên Staging:** 32 tệp (bỏ qua tệp test fixture `0002_p0_04_test_fixture.sql` theo đúng thiết kế `!name.includes("test_fixture")`).
- **Tỷ lệ khớp mã băm SHA-256 đối với các migration đã áp dụng:** 32/32 (100.0%).
- **Không có hiện tượng lệch mã băm (hash drift) hay sửa đổi hồi tố đối với Migration 0032 và các migration tiền nhiệm.**

---

## 5. Kết luận chung về R20-09

Tất cả các thay đổi mã nguồn từ commit `1248ca8` đến commit `36ede21` đều phục vụ trực tiếp cho mục tiêu khắc phục các phát hiện kiểm toán của ULH-EXEC-018, bảo đảm tính thống nhất tuyệt đối giữa logic mã nguồn ứng dụng và các ràng buộc dữ liệu tại tầng cơ sở dữ liệu. Toàn vẹn chuỗi migration được bảo toàn 100%.

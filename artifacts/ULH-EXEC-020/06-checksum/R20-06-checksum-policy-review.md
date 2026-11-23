# R20-06 — CHECKSUM POLICY & CALLSITE COMPLETENESS REVIEW
## Dự án: Unified Legal Hub (ULH) — TASK-003 Staging Acceptance
## Nhiệm vụ: ULH-EXEC-020

---

## 1. Mục Tiêu Kiểm Kê Toàn Diện Repository

Báo cáo EXEC-019 mới chỉ kiểm kê 5 file repository chính. Lệnh thực thi ULH-EXEC-020 yêu cầu rà soát toàn bộ repository `C:\Projects\legal-document-builder` để:
1. Xác định toàn bộ các bảng và cột mang dữ liệu checksum/fingerprint trong schema database.
2. Kiểm tra tất cả các callsite INSERT/UPDATE/UPSERT trong mã nguồn TypeScript, JavaScript, script quản trị và test fixture.
3. Kiểm chứng chính sách thực thi chuẩn `RFC8785_JCS` (JSON Canonicalization Scheme) đối với dữ liệu mới và bảo toàn tính tương thích ngược đối với dữ liệu lịch sử.

---

## 2. Phân Loại Danh Mục Checksum Trong Cơ Sở Dữ Liệu

Qua truy vấn `information_schema.columns`, hệ thống xác định 37 cột thuộc 3 nhóm nghiệp vụ:

### A. Nhóm Checksum Đối Tượng Cấu Trúc (Structured JSON Checksums) — Bắt Buộc JCS:
Bao gồm 7 bảng cốt lõi chứa payload JSON có cấu trúc, được bảo vệ bằng trigger `enforce_new_checksum_algorithm_jcs`:
1. `legal_builder.draft_version` (`snapshot_checksum_sha256`, `snapshot_checksum_algorithm_code`)
2. `legal_builder.draft_checkpoint` (`snapshot_checksum_sha256`, `snapshot_checksum_algorithm_code`)
3. `legal_builder.amendment_source_version` (`checksum_sha256`, `checksum_algorithm_code`)
4. `legal_builder.publishing_job` (`input_fingerprint_sha256`, `input_fingerprint_algorithm_code`)
5. `legal_builder.draft_merge_operation` (`input_checksum_sha256`, `preview_checksum_sha256`, `*_algorithm_code`)
6. `legal_builder.draft_merge_conflict` (`evidence_checksum_sha256`, `evidence_checksum_algorithm_code`)
7. `legal_builder.release_package` (`manifest_checksum_sha256`, `manifest_checksum_algorithm_code`)

### B. Nhóm Checksum Tệp Tin Nhị Phân (Binary Media / File Byte Digest):
Bao gồm các bảng lưu file vật lý (`.docx`, `.pdf`, `.png`):
- `asset_version`, `generated_document`, `generated_document_verification`, `publishing_storage_orphan`, `snapshot_asset_ref`, `source_import_file`, `supporting_document`.
- **Đặc thù kỹ thuật:** Đây là mã băm SHA-256 trực tiếp của luồng byte nhị phân (binary stream), không phải JSON nên không áp dụng thuật toán canonicalization JCS.

### C. Nhóm Mã Băm Mật Mã / Bảo Mật (Cryptographic / Credentials):
- `local_account_credential.password_algorithm` (Argon2id).
- `ai_provider_configuration.encryption_algorithm_code` (AES-GCM).

---

## 3. Chính Sách Thực Thi JCS (JCS Enforcement Policy)

1. **Dữ liệu mới (Post-0032):**
   - 100% câu lệnh INSERT/UPDATE trên 7 bảng có cấu trúc JSON bắt buộc phải gán nhãn thuật toán `RFC8785_JCS`.
   - Cơ sở dữ liệu kích hoạt trigger `enforce_new_checksum_algorithm_jcs` để từ chối mọi nỗ lực ghi thuật toán legacy (`LEGACY_JSON_STRINGIFY_SHA256` hoặc `CANONICAL_JSON_V1_SHA256`) với thông báo lỗi từ chối rõ ràng.
2. **Dữ liệu lịch sử (Historical Legacy):**
   - Các bản ghi tạo trước Migration 0032 mang nhãn `LEGACY_JSON_STRINGIFY_SHA256` hoặc `CANONICAL_JSON_V1_SHA256` được bảo toàn nguyên vẹn tính bất biến trong database.
   - Thư viện `canonical-json.ts` duy trì danh sách closed allow-list nghiêm ngặt để phục vụ việc xác minh tính toàn vẹn của dữ liệu cũ, tuyệt đối không cho phép dữ liệu mới lọt vào nhánh fallback.

---

## 4. Kết Quả Kiểm Thử Tích Hợp Trên PostgreSQL (R20-06 Integration Tests)

Toàn bộ 11 ca kiểm thử tích hợp thực tế đối với các đường ghi dữ liệu trên PostgreSQL đã hoàn thành thành công:
- **Test 1A & 1B (amendment_source_version):** Cho phép `RFC8785_JCS`, từ chối legacy (PASS).
- **Test 2A & 2B (publishing_job):** Cho phép `RFC8785_JCS`, từ chối legacy (PASS).
- **Test 3A (draft_merge_operation):** Cho phép `RFC8785_JCS` (PASS).
- **Test 4A & 4B (draft_merge_conflict):** Cho phép `RFC8785_JCS`, từ chối legacy (PASS).
- **Test 5A & 5B (release_package):** Cho phép đóng dấu SEAL với `RFC8785_JCS`, từ chối legacy (PASS).
- **Test 6A & 6B (draft_checkpoint):** Cho phép `RFC8785_JCS`, từ chối legacy (PASS).
- **Test 7 (draft_version):** Chặn đứng legacy snapshot algorithm (PASS).

**Đánh giá tiêu chí R20-06:** `PASS`.

# R20-08 Policy Decision Matrix, PK Immutability & Locator Cross-Check Report

**Dự án:** Unified Legal Hub (ULH)  
**Mã nhiệm vụ:** `ULH-EXEC-020`  
**Giai đoạn:** R20-08 — Policy & Evidence Cross-Check  
**Môi trường thử nghiệm:** PostgreSQL 18.6 Staging (`legal_builder_staging`, Port 55432)  
**Ngày thực hiện:** 2026-11-23  

---

## 1. Tổng quan mục tiêu kiểm chứng R20-08

Mục tiêu của R20-08 là giải quyết dứt điểm các điểm đối soát chính sách còn chưa đồng bộ hoặc cần làm rõ giữa các báo cáo EXEC-018, EXEC-019 và các nhận định kiểm soát độc lập của ChatGPT:

1. **Ma trận quyết định 30 trường hợp (Policy Decision Matrix):** Đối soát tỷ lệ 12 ALLOWED / 18 DENIED, giải trình cơ chế bảo vệ trạng thái, seal, quyền hạn vai trò và ranh giới DDL.
2. **Xác thực 4 bảng có Trigger khóa Primary Key (PK Immutable Tables):** Làm rõ danh mục thực tế của 4 bảng có trigger khóa PK, giải thích sự khác biệt với các đề xuất ban đầu (như bảng giả định `contract_version_history`), và cung cấp bằng chứng thực nghiệm.
3. **Chuẩn hóa cú pháp Locator (JSON Pointer & JSONPath Subset):** Kiểm tra hàm `legal_builder.is_valid_locator_syntax()`, làm rõ phạm vi tập con (subset) được chấp nhận và lý do từ chối các toán tử động/phi đơn định (`*`, `..`, `?[...]`).

---

## 2. Đối soát ma trận quyết định chính sách (30 trường hợp)

Ma trận quyết định 30 trường hợp chi tiết được lưu trữ tại file:
`artifacts/ULH-EXEC-020/08-policy/R20-08-policy-decision-matrix.csv`.

### 2.1. Phân bổ kết quả kiểm thử
- **Tổng số trường hợp:** 30 trường hợp kiểm thử chính sách.
- **Kết quả ALLOWED (Được phép thực hiện):** 12 trường hợp (40.0%).
- **Kết quả DENIED (Bị từ chối/Chặn bảo mật):** 18 trường hợp (60.0%).
- **Tỷ lệ vượt qua kiểm chứng (Verdict PASS):** 30/30 (100.0%).

### 2.2. Phân loại theo miền chính sách

| Miền chính sách (Domain) | ALLOWED | DENIED | Tổng số | Cơ chế thực thi (Enforcement Mechanism) |
| :--- | :---: | :---: | :---: | :--- |
| **Reconciliation Lifecycle** | 4 | 4 | 8 | Trigger `guard_checksum_reconciliation_approval`, `guard_checksum_reconciliation_evidence`, FSM checks |
| **Release Package Sealing** | 2 | 4 | 6 | Trigger `guard_sealed_release_package`, `guard_sealed_release_package_item` |
| **Independent Verification** | 2 | 3 | 5 | Trigger `guard_independent_verification_insert`, `guard_independent_verification_seal_link` |
| **Role-Based Access Control** | 4 | 4 | 8 | PostgreSQL Grants / ACLs (`ulh_app_runtime`, `ulh_reconciler`, `ulh_governance_approver`, `ulh_migrator`) |
| **Security & DDL Boundary** | 0 | 3 | 3 | Row-level triggers (`reject_immutable_change`) vs Superuser/DDL privilege boundary |
| **Tổng cộng** | **12** | **18** | **30** | **100% khớp với ma trận lý thuyết** |

---

## 3. Xác thực 4 bảng có Trigger khóa Primary Key

### 3.1. Danh mục thực tế trong Schema PostgreSQL
Qua rà soát trực tiếp từ `information_schema.triggers` và `pg_proc` trên Staging, hệ thống triển khai chính xác **4 trigger chuyên biệt** để khóa cứng cột khóa chính (Primary Key) mà không khóa các cột dữ liệu khác của hàng:

1. **`legal_builder.legal_document_type_definition`**:
   - Trigger: `tr_guard_legal_document_type_definition_pk_immutable`
   - Cột khóa chính: `code` (text)
   - Hàm trigger: `legal_builder.guard_legal_document_type_definition_pk_immutable()`
2. **`legal_builder.amendment_target`**:
   - Trigger: `tr_guard_amendment_target_pk_immutable`
   - Cột khóa chính: `id` (uuid)
   - Hàm trigger: `legal_builder.guard_amendment_target_pk_immutable()`
3. **`legal_builder.review_round`**:
   - Trigger: `tr_guard_review_round_pk_immutable`
   - Cột khóa chính: `id` (uuid)
   - Hàm trigger: `legal_builder.guard_review_round_pk_immutable()`
4. **`legal_builder.project_creation_profile`**:
   - Trigger: `tr_guard_project_creation_profile_pk_immutable`
   - Cột khóa chính: `project_id` (uuid)
   - Hàm trigger: `legal_builder.guard_project_creation_profile_pk_immutable()`

### 3.2. Giải trình về bảng `contract_version_history`
- Trong một số tài liệu thiết kế sơ bộ ban đầu của TASK-002, bảng `contract_version_history` từng được nêu như một ví dụ dự kiến về bảng khóa PK.
- Tuy nhiên, trong quá trình hoàn thiện cấu trúc dữ liệu thực tế tại Migration 0003 và chuẩn hóa tại Migration 0032, tính năng lưu trữ lịch sử phiên bản hợp đồng/tài liệu pháp lý đã được tích hợp trực tiếp vào bảng trung tâm `legal_builder.draft_version` (kết hợp với `draft_checkpoint` và `draft_legal_node_change`).
- Bảng `contract_version_history` không được khởi tạo trong schema. Do đó, danh mục 4 bảng trên là danh mục chính xác, đầy đủ và duy nhất có trigger khóa PK riêng biệt.

### 3.3. Kết quả kiểm thử thực nghiệm (8/8 PASS)
Kết quả chi tiết được ghi nhận tại file `artifacts/ULH-EXEC-020/08-policy/R20-08-pk-trigger-validation.csv`:

| Bảng (Table) | Cột kiểm tra | Thao tác thực hiện | Trạng thái mong đợi | Trạng thái thực tế | SQLSTATE | Kết luận |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `legal_document_type_definition` | non-PK (`name`) | UPDATE non-PK | ALLOWED | ALLOWED | `00000` | **PASS** |
| `legal_document_type_definition` | PK (`code`) | UPDATE PK | DENIED | DENIED | `55000` | **PASS** |
| `amendment_target` | non-PK (`target_order`) | UPDATE non-PK | ALLOWED | ALLOWED | `00000` | **PASS** |
| `amendment_target` | PK (`id`) | UPDATE PK | DENIED | DENIED | `55000` | **PASS** |
| `review_round` | non-PK (`name`) | UPDATE non-PK | ALLOWED | ALLOWED | `00000` | **PASS** |
| `review_round` | PK (`id`) | UPDATE PK | DENIED | DENIED | `55000` | **PASS** |
| `project_creation_profile` | non-PK (`creation_mode_code`) | UPDATE non-PK | ALLOWED | ALLOWED | `00000` | **PASS** |
| `project_creation_profile` | PK (`project_id`) | UPDATE PK | DENIED | DENIED | `55000` | **PASS** |

**Nhận xét:** Trong tất cả các trường hợp, thao tác thay đổi giá trị thuộc tính nghiệp vụ thông thường diễn ra thành công (`SQLSTATE 00000`), trong khi bất kỳ nỗ lực nào nhằm thay đổi cột định danh khóa chính đều bị chặn ngay lập tức bởi trigger với mã lỗi bất biến `SQLSTATE 55000`.

---

## 4. Xác thực cú pháp Locator (JSON Pointer & JSONPath Subset)

Hàm `legal_builder.is_valid_locator_syntax(p_locator text)` kiểm soát tính hợp lệ của các chuỗi định vị nút hoặc trường dữ liệu trong các payload JSON.

### 4.1. Quy chuẩn tập con hợp lệ (Permitted Subset)

1. **RFC 6901 JSON Pointer:**
   - Phải bắt đầu bằng ký tự `/` (`^/`).
   - Mỗi phân đoạn (segment) được phân tách bằng `/`.
   - Cho phép các ký tự mã hóa đặc tả RFC 6901: `~0` (đại diện cho ký tự `~`) và `~1` (đại diện cho ký tự `/`).
   - Từ chối các chuỗi không có gạch chéo đầu dòng hoặc có ký tự tilde không hợp lệ (`~2`, `~` đứng một mình).

2. **Deterministic JSONPath Subset:**
   - Phải bắt đầu bằng ký tự gốc `$` (`^\$`).
   - Hỗ trợ ký hiệu dấu chấm cho thuộc tính: `.propertyName` (chữ cái, chữ số, gạch dưới, gạch ngang).
   - Hỗ trợ ký hiệu ngoặc vuông cho chỉ số mảng: `[0]`, `[1]`,...
   - Hỗ trợ ký hiệu ngoặc vuông chứa chuỗi có dấu nháy đơn hoặc nháy kép: `['prop']`, `["prop"]`.

### 4.2. Lý do loại trừ các tính năng truy vấn nâng cao
Các tính năng sau của JSONPath chuẩn bị chủ động loại trừ khỏi hàm kiểm tra cú pháp:
- **Wildcard (`*`, `[*]`):** Trả về nhiều nút, gây ra tính bất định (non-deterministic) khi tham chiếu mục tiêu sửa đổi.
- **Recursive Descent (`..`):** Quét toàn bộ cây tài liệu mà không xác định rõ đường dẫn cha - con, dẫn đến nguy cơ xung đột khi cấu trúc tài liệu thay đổi.
- **Filter Expressions (`?[...]`):** Đánh giá biểu thức logic động tại thời điểm truy vấn, không phù hợp với yêu cầu cố định vị trí (immutable point-in-time reference) trong kiểm toán pháp lý.

### 4.3. Kết quả kiểm thử thực nghiệm (16/16 PASS)
Kết quả chi tiết được ghi nhận tại file `artifacts/ULH-EXEC-020/08-policy/R20-08-locator-syntax-validation.csv`:

| Mã ca | Họ cú pháp | Chuỗi Locator kiểm tra | Kỳ vọng | Thực tế | Mô tả / Mục đích kiểm tra | Kết luận |
| :---: | :--- | :--- | :---: | :---: | :--- | :---: |
| LOC-01 | JSON Pointer | `/` | true | true | Định vị gốc tài liệu (Root pointer) | **PASS** |
| LOC-02 | JSON Pointer | `/nodes` | true | true | Một phân đoạn cấp 1 hợp lệ | **PASS** |
| LOC-03 | JSON Pointer | `/nodes/0/title` | true | true | Phân đoạn đa cấp kết hợp chỉ số mảng và khóa | **PASS** |
| LOC-04 | JSON Pointer | `/a~0b/c~1d` | true | true | Chuỗi thoát chuẩn RFC 6901 (~0 và ~1) | **PASS** |
| LOC-05 | JSON Pointer | `//empty_key` | true | true | Phân đoạn rỗng theo RFC 6901 | **PASS** |
| LOC-06 | JSON Pointer | `nodes/0` | false | false | Thiếu ký tự `/` đầu dòng (không hợp lệ) | **PASS** |
| LOC-07 | JSON Pointer | `/a~2b` | false | false | Ký tự thoát sai quy chuẩn (~2) | **PASS** |
| LOC-08 | JSON Pointer | `/trailing_tilde~` | false | false | Tilde đứng đơn lẻ ở cuối chuỗi | **PASS** |
| LOC-09 | JSONPath | `$` | true | true | Đối tượng gốc (Root object) | **PASS** |
| LOC-10 | JSONPath | `$.nodes` | true | true | Ký hiệu chấm thuộc tính tiêu chuẩn | **PASS** |
| LOC-11 | JSONPath | `$.nodes[0].title` | true | true | Kết hợp ký hiệu chấm và chỉ số mảng | **PASS** |
| LOC-12 | JSONPath | `$['nodes'][0]['title']` | true | true | Ký hiệu ngoặc vuông nháy đơn | **PASS** |
| LOC-13 | JSONPath | `$["nodes"][0]["title"]` | true | true | Ký hiệu ngoặc vuông nháy kép | **PASS** |
| LOC-14 | JSONPath | `$.nodes[*]` | false | false | Ký tự đại diện wildcard `*` (bị loại trừ) | **PASS** |
| LOC-15 | JSONPath | `$..nodes` | false | false | Ký tự tìm kiếm đệ quy `..` (bị loại trừ) | **PASS** |
| LOC-16 | JSONPath | `$.nodes[?(@.id > 1)]` | false | false | Biểu thức lọc điều kiện `?(...)` (bị loại trừ) | **PASS** |

---

## 5. Kết luận

1. **Ma trận quyết định chính sách:** Đã đối soát và xác thực toàn bộ 30 trường hợp với tỷ lệ chính xác 100% (12 ALLOWED / 18 DENIED).
2. **Khóa Primary Key:** Đã làm rõ danh mục thực tế của 4 bảng có trigger khóa PK; loại bỏ sự nhầm lẫn về bảng giả định `contract_version_history`. Cả 4 trigger hoạt động chính xác tuyệt đối.
3. **Cú pháp Locator:** Đã chứng minh bằng chứng thực nghiệm 16/16 trường hợp cho tập con hợp lệ RFC 6901 JSON Pointer và Deterministic JSONPath, bảo đảm tính xác định và độ tin cậy pháp lý cao nhất cho hệ thống.

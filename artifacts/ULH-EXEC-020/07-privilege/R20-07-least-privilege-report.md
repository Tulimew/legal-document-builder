# R20-07 — LEAST PRIVILEGE & ROLE INHERITANCE VERIFICATION REPORT
## Dự án: Unified Legal Hub (ULH) — TASK-003 Staging Acceptance
## Nhiệm vụ: ULH-EXEC-020

---

## 1. Mục Tiêu & Cơ Chế Kiểm Soát Quyền Hạn

Kiểm tra và chứng minh nguyên tắc đặc quyền tối thiểu (Least Privilege) đối với 4 vai trò cơ sở dữ liệu thực tế liên quan đến TASK-003:
1. `ulh_app_runtime`: Vai trò kết nối của ứng dụng web phục vụ người dùng.
2. `ulh_reconciler`: Vai trò của dịch vụ quét và tính toán đối soát checksum.
3. `ulh_governance_approver`: Vai trò của dịch vụ xác minh độc lập và phê duyệt quản trị.
4. `ulh_migrator`: Vai trò thực thi DDL khi chạy migration.

---

## 2. Kiểm Tra Thuộc Tính & Tính Kế Thừa (Role Attributes & Inheritance)

Kết quả truy vấn trực tiếp từ bảng danh mục `pg_roles` và `pg_auth_members`:

| Role Name | Superuser (`rolsuper`) | Inherit (`rolinherit`) | Create Role (`rolcreaterole`) | Create DB (`rolcreatedb`) | Can Login (`rolcanlogin`) | Bypass RLS (`rolbypassrls`) | Member Of |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `ulh_app_runtime` | `false` | `false` | `false` | `false` | `true` | `false` | *None* |
| `ulh_reconciler` | `false` | `false` | `false` | `false` | `true` | `false` | *None* |
| `ulh_governance_approver` | `false` | `false` | `false` | `false` | `true` | `false` | *None* |
| `ulh_migrator` | `false` | `false` | `false` | `false` | `true` | `false` | *None* |

**Kết luận thuộc tính:**
- Toàn bộ 4 role ứng dụng và nghiệp vụ đều **KHÔNG CÓ QUYỀN KẾ THỪA** (`rolinherit = false`).
- Không có role nào là thành viên của `postgres` hay `legal_builder` (superuser).
- Không tồn tại đường dẫn leo thang đặc quyền (privilege escalation path) qua cơ chế kế thừa role của PostgreSQL.

---

## 3. Ma Trận Quyền Thực Tế Trên Các Bảng Kiểm Toán & Bằng Chứng Đối Soát

| Bảng Cơ Sở Dữ Liệu | `ulh_app_runtime` | `ulh_reconciler` | `ulh_governance_approver` | `ulh_migrator` (Owner) |
|---|:---:|:---:|:---:|:---:|
| `checksum_reconciliation_evidence` | SELECT | **INSERT, SELECT** | SELECT | DDL, DML |
| `checksum_independent_verification` | SELECT | SELECT | **INSERT, SELECT** | DDL, DML |
| `checksum_reconciliation_approval` | SELECT | SELECT | **INSERT, SELECT** | DDL, DML |
| `system_audit_event` | INSERT, SELECT | INSERT, SELECT | INSERT, SELECT | DDL, DML |
| `draft_version` | INSERT, SELECT | SELECT | *Không có quyền (42501)* | DDL, DML |

### Điểm chốt kiểm toán bảo mật:
1. **Tách biệt vai trò đối soát và phê duyệt:**
   - `ulh_reconciler` **hoàn toàn bị cấm** INSERT vào bảng xác minh độc lập (`checksum_independent_verification`) và bảng phê duyệt (`checksum_reconciliation_approval`).
   - `ulh_governance_approver` **hoàn toàn bị cấm** tạo bằng chứng đối soát (`checksum_reconciliation_evidence`) và không có quyền truy cập bảng `draft_version`.
2. **Bảo vệ bất biến đối với các vai trò nghiệp vụ:**
   - Cả 3 vai trò `ulh_app_runtime`, `ulh_reconciler`, và `ulh_governance_approver` đều bị từ chối quyền `UPDATE`, `DELETE`, `TRUNCATE`, và `ALTER TABLE` trên toàn bộ các bảng C1 và bảng bằng chứng đối soát (SQLSTATE `42501`).
3. **Thực thi hàm `SECURITY INVOKER`:**
   - Các trigger function `bind_reconciliation_evidence_actor()`, `guard_independent_verification_insert()`, và `guard_reconciliation_approval_insert()` đều được định nghĩa dạng `SECURITY INVOKER`. Khi thực thi, trigger chạy đúng với quyền hạn của role đang kết nối, bảo đảm không xảy ra tình trạng bypass kiểm tra quyền nhờ đặc quyền của function owner.

**Đánh giá tiêu chí R20-07:** `PASS`.

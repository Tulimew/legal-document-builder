# MA TRẬN PHÂN QUYỀN VAI TRÒ DATABASE (R19-06)

| Database Role | Bảng Truy Cập | Quyền Cấp | Quyền Bị Chặn | Trạng Thái Thử Nghiệm |
| :--- | :--- | :--- | :--- | :---: |
| `ulh_reconciler` | `checksum_reconciliation_evidence` | SELECT, INSERT | UPDATE, DELETE, TRUNCATE | **PASS** |
| `ulh_reconciler` | `checksum_reconciliation_approval` | SELECT | INSERT, UPDATE, DELETE | **PASS** |
| `ulh_reconciler` | `user_account` | SELECT | INSERT, UPDATE, DELETE | **PASS** |
| `ulh_governance_approver` | `checksum_independent_verification` | SELECT, INSERT | UPDATE, DELETE, TRUNCATE | **PASS** |
| `ulh_governance_approver` | `checksum_reconciliation_approval` | SELECT, INSERT | UPDATE, DELETE, TRUNCATE | **PASS** |
| `ulh_governance_approver` | `checksum_reconciliation_evidence` | SELECT | INSERT, UPDATE, DELETE | **PASS** |
| `ulh_app_runtime` | `legal_document` | SELECT | UPDATE, DELETE, TRUNCATE | **PASS** |
| `ulh_app_runtime` | 12 Bảng C2 (FOR SHARE) | SELECT, UPDATE (Cột chỉ định) | DELETE, TRUNCATE, UPDATE (cột khác) | **PASS** |
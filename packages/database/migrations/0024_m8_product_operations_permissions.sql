BEGIN;

INSERT INTO legal_builder.permission_definition(code,name,description,created_at) VALUES
('PROJECT_SEARCH','Tìm kiếm trong hồ sơ','Tìm metadata và nội dung nghiệp vụ trong đúng hồ sơ được cấp quyền',clock_timestamp()),
('PROJECT_AUDIT_READ','Đọc hoạt động hồ sơ','Xem timeline audit đã giảm thiểu dữ liệu nhạy cảm',clock_timestamp()),
('PROJECT_MEMBERSHIP_READ','Đọc thành viên hồ sơ','Xem membership, đơn vị và role trong đúng hồ sơ',clock_timestamp())
ON CONFLICT(code) DO NOTHING;

INSERT INTO legal_builder.role_permission(role_definition_id,permission_code)
SELECT r.id,p.code FROM legal_builder.role_definition r
CROSS JOIN legal_builder.permission_definition p
WHERE r.code='DEV_WORKFLOW_MANAGER' AND p.code IN('PROJECT_SEARCH','PROJECT_AUDIT_READ','PROJECT_MEMBERSHIP_READ')
ON CONFLICT DO NOTHING;

COMMIT;

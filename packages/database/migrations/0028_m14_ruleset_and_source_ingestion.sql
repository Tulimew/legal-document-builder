BEGIN;

INSERT INTO legal_builder.system_permission_definition(code,name,description) VALUES
('RULESET_READ','Xem bộ quy tắc cấu trúc','Đọc bộ quy tắc cấu trúc và căn cứ nguồn'),
('RULESET_MANAGE','Quản lý bộ quy tắc cấu trúc','Tạo bộ quy tắc cấu trúc có phiên bản và căn cứ nguồn');

INSERT INTO legal_builder.system_role_permission(role_code,permission_code) VALUES
('SYSTEM_ADMIN','RULESET_READ'),
('SYSTEM_ADMIN','RULESET_MANAGE');

COMMIT;

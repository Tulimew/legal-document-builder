BEGIN;
INSERT INTO legal_builder.permission_definition(code,name,description,created_at) VALUES
('DRAFT_BRANCH_READ','Xem nhánh dự thảo','Xem danh sách nhánh, fork point và head',clock_timestamp()),
('DRAFT_BRANCH_CREATE','Tạo nhánh dự thảo','Fork workspace từ DraftVersion bất biến',clock_timestamp()),
('DRAFT_BRANCH_CLOSE','Đóng nhánh dự thảo','Đóng hoặc đánh dấu nhánh đã hợp nhất',clock_timestamp()),
('DRAFT_MERGE_ANALYZE','Phân tích hợp nhất','Phân tích three-way merge từ version graph',clock_timestamp()),
('DRAFT_MERGE_RESOLVE','Giải quyết xung đột hợp nhất','Ghi quyết định xung đột có lịch sử',clock_timestamp()),
('DRAFT_MERGE_COMPLETE','Hoàn thành hợp nhất','Tạo DraftVersion hợp nhất bất biến',clock_timestamp());
COMMIT;

BEGIN;

CREATE TABLE legal_builder.ai_report_template_definition (
    code text PRIMARY KEY,
    name text NOT NULL,
    document_kind_code text NOT NULL,
    status_code text NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL,
    CONSTRAINT ck_ai_report_template_definition_code CHECK (btrim(code) <> ''),
    CONSTRAINT ck_ai_report_template_definition_name CHECK (btrim(name) <> ''),
    CONSTRAINT ck_ai_report_template_definition_status CHECK (status_code IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE legal_builder.ai_report_template_version (
    id uuid PRIMARY KEY,
    definition_code text NOT NULL REFERENCES legal_builder.ai_report_template_definition(code),
    version_code text NOT NULL,
    status_code text NOT NULL DEFAULT 'ACTIVE',
    effective_from date NOT NULL,
    effective_to date,
    legal_basis jsonb NOT NULL,
    prompt_instruction text NOT NULL,
    output_outline jsonb NOT NULL,
    created_at timestamptz NOT NULL,
    CONSTRAINT uq_ai_report_template_version UNIQUE (definition_code, version_code),
    CONSTRAINT ck_ai_report_template_version_status CHECK (status_code IN ('ACTIVE', 'SUPERSEDED', 'DRAFT')),
    CONSTRAINT ck_ai_report_template_version_dates CHECK (effective_to IS NULL OR effective_to >= effective_from),
    CONSTRAINT ck_ai_report_template_prompt CHECK (btrim(prompt_instruction) <> ''),
    CONSTRAINT ck_ai_report_template_legal_basis_object CHECK (jsonb_typeof(legal_basis) = 'object'),
    CONSTRAINT ck_ai_report_template_outline_array CHECK (jsonb_typeof(output_outline) = 'array')
);

CREATE UNIQUE INDEX uq_ai_report_template_active_version
    ON legal_builder.ai_report_template_version(definition_code)
    WHERE status_code = 'ACTIVE';

INSERT INTO legal_builder.ai_report_template_definition(code,name,document_kind_code,status_code,created_at) VALUES
('POLICY_SUBMISSION','Tờ trình chính sách','SUBMISSION','ACTIVE',clock_timestamp()),
('DRAFT_SUBMISSION','Tờ trình dự án, dự thảo văn bản quy phạm pháp luật','SUBMISSION','ACTIVE',clock_timestamp()),
('POLICY_IMPACT_ASSESSMENT','Báo cáo đánh giá tác động của chính sách','REPORT','ACTIVE',clock_timestamp()),
('POLICY_CODIFICATION_EXPLANATION','Bản thuyết minh quy phạm hóa chính sách theo quy trình xây dựng chính sách','EXPLANATION','ACTIVE',clock_timestamp()),
('DIRECT_CODIFICATION_EXPLANATION','Bản thuyết minh quy phạm hóa chính sách không thực hiện quy trình xây dựng chính sách','EXPLANATION','ACTIVE',clock_timestamp()),
('SPECIAL_IMPACT_ASSESSMENT','Bản đánh giá thủ tục hành chính, phân quyền, phân cấp, bình đẳng giới và chính sách dân tộc','ASSESSMENT','ACTIVE',clock_timestamp()),
('LEGAL_BASIS_REVIEW','Báo cáo rà soát chủ trương, văn bản quy phạm pháp luật và điều ước quốc tế','REPORT','ACTIVE',clock_timestamp()),
('IMPLEMENTATION_REVIEW','Báo cáo tổng kết thi hành pháp luật hoặc đánh giá thực trạng quan hệ xã hội','REPORT','ACTIVE',clock_timestamp()),
('CONSULTATION_SYNTHESIS','Bản tổng hợp ý kiến, tiếp thu, giải trình','SYNTHESIS','ACTIVE',clock_timestamp()),
('DRAFT_COMPARISON','Bản so sánh, thuyết minh nội dung dự thảo','COMPARISON','ACTIVE',clock_timestamp());

INSERT INTO legal_builder.ai_report_template_version(id,definition_code,version_code,status_code,effective_from,legal_basis,prompt_instruction,output_outline,created_at) VALUES
('30000000-0000-4000-8000-000000000001','POLICY_SUBMISSION','2025.07.01','ACTIVE','2025-07-01','{"primary":{"number":"4231/VBHN-BTP","date":"2025-07-15","instrument":"Nghị định hợp nhất Nghị định 78/2025/NĐ-CP và Nghị định 187/2025/NĐ-CP","provision":"Mẫu số 01 Phụ lục IV"},"status":"CURRENT_VERIFIED_2026-09-02"}','Lập dự thảo Tờ trình chính sách theo đúng các đề mục của Mẫu số 01 Phụ lục IV. Chỉ sử dụng dữ liệu đầu vào; để nhãn [CẦN BỔ SUNG] tại phần thiếu dữ liệu. Không tạo nội dung quy phạm.','["Sự cần thiết","Mục tiêu và nội dung chính sách","Tác động và nguồn lực","Tham vấn","Kiến nghị"]',clock_timestamp()),
('30000000-0000-4000-8000-000000000002','DRAFT_SUBMISSION','2025.07.01','ACTIVE','2025-07-01','{"primary":{"number":"4231/VBHN-BTP","date":"2025-07-15","instrument":"Nghị định hợp nhất Nghị định 78/2025/NĐ-CP và Nghị định 187/2025/NĐ-CP","provision":"Mẫu số 02 Phụ lục IV"},"status":"CURRENT_VERIFIED_2026-09-02"}','Lập dự thảo Tờ trình dự án hoặc dự thảo văn bản theo Mẫu số 02 Phụ lục IV. Với văn bản sửa đổi, thay thế, phải tách rõ nội dung sửa đổi, bổ sung, lược bỏ, đơn giản hóa và vấn đề còn ý kiến khác nhau. Không tự soạn quy phạm.','["Sự cần thiết","Mục đích và quan điểm","Quá trình xây dựng","Bố cục và nội dung cơ bản","Vấn đề xin ý kiến","Kiến nghị"]',clock_timestamp()),
('30000000-0000-4000-8000-000000000003','POLICY_IMPACT_ASSESSMENT','2025.07.01','ACTIVE','2025-07-01','{"primary":{"number":"4231/VBHN-BTP","date":"2025-07-15","instrument":"Nghị định hợp nhất Nghị định 78/2025/NĐ-CP và Nghị định 187/2025/NĐ-CP","provision":"Điều 14; Mẫu số 03 Phụ lục IV"},"secondary":{"number":"26/2025/TT-BTP","provision":"Điều 15"},"status":"CURRENT_VERIFIED_2026-09-02"}','Lập dự thảo Báo cáo đánh giá tác động chính sách theo Mẫu số 03. Đánh giá từng giải pháp bằng dữ liệu định lượng và định tính do người dùng cung cấp; nêu nguồn và giả định; không bịa số liệu, chi phí hoặc lợi ích.','["Bối cảnh và vấn đề","Mục tiêu","Các giải pháp","Tác động của từng giải pháp","So sánh và lựa chọn","Nguồn dữ liệu","Phụ lục tính toán"]',clock_timestamp()),
('30000000-0000-4000-8000-000000000004','POLICY_CODIFICATION_EXPLANATION','2025.07.01','ACTIVE','2025-07-01','{"primary":{"number":"4231/VBHN-BTP","date":"2025-07-15","instrument":"Nghị định hợp nhất Nghị định 78/2025/NĐ-CP và Nghị định 187/2025/NĐ-CP","provision":"Mẫu số 04 Phụ lục IV"},"status":"CURRENT_VERIFIED_2026-09-02"}','Lập bản thuyết minh đối chiếu chính sách đã được thông qua với vị trí quy phạm hóa trong dự thảo. Không đề xuất quy phạm mới và không suy đoán quan hệ khi dữ liệu không chứng minh.','["Chính sách đã phê duyệt","Quy định dự thảo tương ứng","Mức độ quy phạm hóa","Sai khác cần xác minh"]',clock_timestamp()),
('30000000-0000-4000-8000-000000000005','DIRECT_CODIFICATION_EXPLANATION','2025.07.01','ACTIVE','2025-07-01','{"primary":{"number":"4231/VBHN-BTP","date":"2025-07-15","instrument":"Nghị định hợp nhất Nghị định 78/2025/NĐ-CP và Nghị định 187/2025/NĐ-CP","provision":"Mẫu số 05 Phụ lục IV"},"status":"CURRENT_VERIFIED_2026-09-02"}','Lập bản thuyết minh nội dung được quy phạm hóa đối với trường hợp không thực hiện quy trình xây dựng chính sách. Chỉ mô tả và truy nguồn từ hồ sơ người dùng cung cấp.','["Vấn đề và căn cứ","Nội dung quy phạm hóa","Vị trí trong dự thảo","Tính thống nhất","Nội dung cần xác minh"]',clock_timestamp()),
('30000000-0000-4000-8000-000000000006','SPECIAL_IMPACT_ASSESSMENT','2025.07.01','ACTIVE','2025-07-01','{"primary":{"number":"4231/VBHN-BTP","date":"2025-07-15","instrument":"Nghị định hợp nhất Nghị định 78/2025/NĐ-CP và Nghị định 187/2025/NĐ-CP","provision":"Mẫu số 06 Phụ lục IV"},"status":"CURRENT_VERIFIED_2026-09-02"}','Lập bản đánh giá các nội dung phát sinh trong hồ sơ: thủ tục hành chính; phân quyền, phân cấp và thực hiện nhiệm vụ được phân cấp; bình đẳng giới; chính sách dân tộc. Chỉ đánh giá mục có dữ liệu, ghi rõ mục không phát sinh hoặc cần xác minh.','["Thủ tục hành chính","Phân quyền và phân cấp","Bình đẳng giới","Chính sách dân tộc","Nguồn và giả định"]',clock_timestamp()),
('30000000-0000-4000-8000-000000000007','LEGAL_BASIS_REVIEW','2025.07.01','ACTIVE','2025-07-01','{"primary":{"number":"4231/VBHN-BTP","date":"2025-07-15","instrument":"Nghị định hợp nhất Nghị định 78/2025/NĐ-CP và Nghị định 187/2025/NĐ-CP","provision":"Mẫu số 07 Phụ lục IV"},"status":"CURRENT_VERIFIED_2026-09-02"}','Lập báo cáo rà soát chủ trương, đường lối của Đảng, văn bản quy phạm pháp luật và điều ước quốc tế liên quan. Không khẳng định hiệu lực hoặc tính pháp lý nếu đầu vào không có nguồn kiểm chứng; lập riêng danh sách cần chuyên gia xác minh.','["Phạm vi rà soát","Danh mục nguồn","Kết quả đối chiếu","Mâu thuẫn hoặc chồng chéo","Kiến nghị kiểm tra"]',clock_timestamp()),
('30000000-0000-4000-8000-000000000008','IMPLEMENTATION_REVIEW','2025.07.01','ACTIVE','2025-07-01','{"primary":{"number":"4231/VBHN-BTP","date":"2025-07-15","instrument":"Nghị định hợp nhất Nghị định 78/2025/NĐ-CP và Nghị định 187/2025/NĐ-CP","provision":"Mẫu số 08 Phụ lục IV"},"status":"CURRENT_VERIFIED_2026-09-02"}','Lập báo cáo tổng kết thi hành pháp luật hoặc đánh giá thực trạng quan hệ xã hội từ số liệu và tài liệu được cung cấp. Phân biệt sự kiện, nhận định và dữ liệu còn thiếu; không bịa số liệu.','["Tổ chức thi hành","Kết quả","Tồn tại và nguyên nhân","Thực trạng quan hệ xã hội","Đề xuất xử lý","Nguồn dữ liệu"]',clock_timestamp()),
('30000000-0000-4000-8000-000000000009','CONSULTATION_SYNTHESIS','2025.07.01','ACTIVE','2025-07-01','{"primary":{"number":"4231/VBHN-BTP","date":"2025-07-15","instrument":"Nghị định hợp nhất Nghị định 78/2025/NĐ-CP và Nghị định 187/2025/NĐ-CP","provision":"Mẫu số 09 Phụ lục IV"},"status":"CURRENT_VERIFIED_2026-09-02"}','Lập bản tổng hợp ý kiến và dự thảo tiếp thu, giải trình theo Mẫu số 09. Bảo toàn chủ thể, nội dung và nguồn ý kiến; không tự quyết định tiếp thu. Mọi đề xuất phải mang nhãn ĐỀ XUẤT ĐỂ NGƯỜI CÓ THẨM QUYỀN QUYẾT ĐỊNH.','["Chính sách hoặc điều khoản","Chủ thể góp ý","Nội dung góp ý","Dự kiến tiếp thu hoặc giải trình","Trạng thái cần quyết định"]',clock_timestamp()),
('30000000-0000-4000-8000-000000000010','DRAFT_COMPARISON','2025.07.01','ACTIVE','2025-07-01','{"primary":{"number":"4231/VBHN-BTP","date":"2025-07-15","instrument":"Nghị định hợp nhất Nghị định 78/2025/NĐ-CP và Nghị định 187/2025/NĐ-CP","provision":"Mẫu số 10 Phụ lục IV"},"status":"CURRENT_VERIFIED_2026-09-02"}','Lập bản so sánh, thuyết minh giữa văn bản hiện hành và dự thảo sửa đổi, bổ sung, thay thế. Chỉ sử dụng cặp dữ liệu trước/sau được cung cấp; không dựng quan hệ hoặc nội dung còn thiếu.','["Quy định hiện hành","Nội dung dự thảo","Loại thay đổi","Lý do và căn cứ","Vấn đề cần xác minh"]',clock_timestamp());

COMMIT;

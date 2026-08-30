BEGIN;
INSERT INTO legal_builder.publishing_template_definition(id,code,name,status_code,created_at)VALUES('70000000-0000-4000-8000-000000000003','TPL-CANONICAL-DRAFT','Dự thảo văn bản từ canonical snapshot','DEVELOPMENT_ONLY',clock_timestamp());
INSERT INTO legal_builder.publishing_template_version(id,definition_id,version_code,status_code,renderer_kind_code,schema_version,configuration,provenance,created_at)VALUES('70000000-0000-4000-8000-000000000013','70000000-0000-4000-8000-000000000003','1.0.0-development','DEVELOPMENT_ONLY','DRAFT_DOCX','1','{"filename":"du-thao-van-ban.docx","title":"DỰ THẢO VĂN BẢN QUY PHẠM PHÁP LUẬT","font":"Times New Roman"}'::jsonb,'{"migration":"0021","scope":"DEVELOPMENT_ONLY","legalApproval":"NOT_APPROVED"}'::jsonb,clock_timestamp());
COMMIT;

BEGIN;
INSERT INTO legal_builder.publishing_template_definition(id,code,name,status_code,created_at)VALUES('70000000-0000-4000-8000-000000000004','TPL-DRAFT-PDF','Dự thảo PDF','DEVELOPMENT_ONLY',clock_timestamp());
INSERT INTO legal_builder.publishing_template_version(id,definition_id,version_code,status_code,renderer_kind_code,schema_version,configuration,provenance,created_at)VALUES('70000000-0000-4000-8000-000000000014','70000000-0000-4000-8000-000000000004','1.0.0-development','DEVELOPMENT_ONLY','DRAFT_PDF','1','{"filename":"du-thao.pdf","title":"DỰ THẢO VĂN BẢN QUY PHẠM PHÁP LUẬT","lineage":"DIRECT_IMMUTABLE_SNAPSHOT"}'::jsonb,'{"migration":"0022","legalApproval":"NOT_APPROVED"}'::jsonb,clock_timestamp());
CREATE TRIGGER tr_generated_document_immutable BEFORE UPDATE OR DELETE ON legal_builder.generated_document FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();
COMMIT;

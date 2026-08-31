BEGIN;

CREATE TABLE legal_builder.publishing_template_definition(
  id uuid PRIMARY KEY,code text NOT NULL UNIQUE,name text NOT NULL,status_code text NOT NULL,
  created_at timestamptz NOT NULL,created_by_user_id uuid REFERENCES legal_builder.user_account(id),
  CONSTRAINT ck_publishing_template_definition_status CHECK(status_code IN('DEVELOPMENT_ONLY','APPROVED','RETIRED')));

CREATE TABLE legal_builder.publishing_template_version(
  id uuid PRIMARY KEY,definition_id uuid NOT NULL REFERENCES legal_builder.publishing_template_definition(id),
  version_code text NOT NULL,status_code text NOT NULL,renderer_kind_code text NOT NULL,schema_version text NOT NULL,
  configuration jsonb NOT NULL,provenance jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL,
  created_by_user_id uuid REFERENCES legal_builder.user_account(id),approved_at timestamptz,approved_by_user_id uuid REFERENCES legal_builder.user_account(id),
  UNIQUE(definition_id,version_code),CONSTRAINT ck_publishing_template_version_status CHECK(status_code IN('DEVELOPMENT_ONLY','APPROVED','RETIRED')),
  CONSTRAINT ck_publishing_template_configuration CHECK(jsonb_typeof(configuration)='object'),CONSTRAINT ck_publishing_template_provenance CHECK(jsonb_typeof(provenance)='object'));

CREATE TABLE legal_builder.publishing_job(
  id uuid PRIMARY KEY,project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),artifact_kind_code text NOT NULL,
  source_draft_version_id uuid NOT NULL REFERENCES legal_builder.draft_version(id),template_version_id uuid NOT NULL REFERENCES legal_builder.publishing_template_version(id),
  input_descriptor jsonb NOT NULL,input_fingerprint_sha256 char(64) NOT NULL,idempotency_key text NOT NULL,status_code text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,max_attempts integer NOT NULL DEFAULT 3,lease_owner text,lease_expires_at timestamptz,
  sanitized_error text,requested_at timestamptz NOT NULL,requested_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  requested_by_membership_id uuid REFERENCES legal_builder.project_membership(id),correlation_id text NOT NULL,started_at timestamptz,completed_at timestamptz,
  UNIQUE(project_id,idempotency_key),CONSTRAINT ck_publishing_job_status CHECK(status_code IN('QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELLED')),
  CONSTRAINT ck_publishing_job_attempts CHECK(attempts>=0 AND max_attempts>0 AND attempts<=max_attempts),CONSTRAINT ck_publishing_job_input CHECK(jsonb_typeof(input_descriptor)='object'),
  CONSTRAINT ck_publishing_job_checksum CHECK(input_fingerprint_sha256~'^[0-9A-Fa-f]{64}$'));

CREATE TABLE legal_builder.generated_document(
  id uuid PRIMARY KEY,project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),job_id uuid NOT NULL UNIQUE REFERENCES legal_builder.publishing_job(id),
  artifact_kind_code text NOT NULL,source_draft_version_id uuid NOT NULL REFERENCES legal_builder.draft_version(id),template_version_id uuid NOT NULL REFERENCES legal_builder.publishing_template_version(id),
  renderer_version text NOT NULL,storage_key text NOT NULL UNIQUE,media_type text NOT NULL,byte_size bigint NOT NULL,checksum_sha256 char(64) NOT NULL,
  status_code text NOT NULL,verification_status_code text NOT NULL,verified_at timestamptz,created_at timestamptz NOT NULL,
  CONSTRAINT ck_generated_document_status CHECK(status_code IN('AVAILABLE','FAILED_VERIFICATION','ORPHANED')),
  CONSTRAINT ck_generated_document_size CHECK(byte_size>=0),CONSTRAINT ck_generated_document_checksum CHECK(checksum_sha256~'^[0-9A-Fa-f]{64}$'));

CREATE TABLE legal_builder.release_package(
  id uuid PRIMARY KEY,project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),code text NOT NULL,name text NOT NULL,purpose text NOT NULL,
  status_code text NOT NULL DEFAULT 'DRAFT',revision bigint NOT NULL DEFAULT 0,authority_basis text,manifest jsonb,manifest_checksum_sha256 char(64),
  created_at timestamptz NOT NULL,created_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),created_by_membership_id uuid REFERENCES legal_builder.project_membership(id),
  sealed_at timestamptz,sealed_by_user_id uuid REFERENCES legal_builder.user_account(id),sealed_by_membership_id uuid REFERENCES legal_builder.project_membership(id),
  UNIQUE(project_id,code),CONSTRAINT ck_release_package_status CHECK(status_code IN('DRAFT','SEALED','SUPERSEDED')),CONSTRAINT ck_release_package_revision CHECK(revision>=0),
  CONSTRAINT ck_release_package_manifest CHECK(manifest IS NULL OR jsonb_typeof(manifest)='object'));

CREATE TABLE legal_builder.release_package_item(
  package_id uuid NOT NULL REFERENCES legal_builder.release_package(id),item_order integer NOT NULL,item_type_code text NOT NULL,item_id uuid NOT NULL,
  role_code text NOT NULL,label text NOT NULL,created_at timestamptz NOT NULL,created_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  PRIMARY KEY(package_id,item_order),UNIQUE(package_id,item_type_code,item_id),CONSTRAINT ck_release_package_item_type CHECK(item_type_code IN('DRAFT_VERSION','GENERATED_DOCUMENT','SUPPORTING_DOCUMENT')),CONSTRAINT ck_release_package_item_order CHECK(item_order>=0));

INSERT INTO legal_builder.publishing_template_definition(id,code,name,status_code,created_at) VALUES
('70000000-0000-4000-8000-000000000001','TPL-REVIEW-SYNTHESIS','Bản tổng hợp ý kiến, tiếp thu, giải trình','DEVELOPMENT_ONLY',clock_timestamp()),
('70000000-0000-4000-8000-000000000002','TPL-DRAFT-COMPARISON','Bản so sánh, thuyết minh nội dung dự thảo','DEVELOPMENT_ONLY',clock_timestamp());
INSERT INTO legal_builder.publishing_template_version(id,definition_id,version_code,status_code,renderer_kind_code,schema_version,configuration,provenance,created_at) VALUES
('70000000-0000-4000-8000-000000000011','70000000-0000-4000-8000-000000000001','1.0.0-prototype','DEVELOPMENT_ONLY','REVIEW_SYNTHESIS_DOCX','1',
 '{"filename":"ban-tong-hop-y-kien-tiep-thu-giai-trinh.docx","title":"BẢN TỔNG HỢP Ý KIẾN, TIẾP THU, GIẢI TRÌNH Ý KIẾN GÓP Ý, PHẢN BIỆN XÃ HỘI ĐỐI VỚI DỰ THẢO","columns":[3300,1800,3600,3000]}'::jsonb,
 '{"backfillMigration":"0020","source":"app/web/src/config/publishing-templates/v1.json","legalApproval":"NOT_APPROVED","changesHistoricalArtifact":false}'::jsonb,clock_timestamp()),
('70000000-0000-4000-8000-000000000012','70000000-0000-4000-8000-000000000002','1.0.0-prototype','DEVELOPMENT_ONLY','DRAFT_COMPARISON_DOCX','1',
 '{"filename":"ban-so-sanh-thuyet-minh-noi-dung-du-thao.docx","title":"BẢN SO SÁNH, THUYẾT MINH NỘI DUNG DỰ THẢO","columns":[4200,5000,2800]}'::jsonb,
 '{"backfillMigration":"0020","source":"app/web/src/config/publishing-templates/v1.json","legalApproval":"NOT_APPROVED","changesHistoricalArtifact":false}'::jsonb,clock_timestamp());

INSERT INTO legal_builder.permission_definition(code,name,description,created_at) VALUES
('PUBLISHING_TEMPLATE_READ','Đọc mẫu xuất bản','Đọc template/version xuất bản',clock_timestamp()),
('PUBLISHING_TEMPLATE_MANAGE','Quản lý mẫu xuất bản','Tạo version và quản lý trạng thái template',clock_timestamp()),
('PUBLISHING_REQUEST','Yêu cầu sinh tài liệu','Tạo publishing job từ input bất biến',clock_timestamp()),
('PUBLISHING_READ','Đọc job và tài liệu sinh','Xem publishing job và GeneratedDocument',clock_timestamp()),
('RELEASE_PACKAGE_CREATE','Tạo gói phát hành','Tạo và cập nhật gói nháp',clock_timestamp()),
('RELEASE_PACKAGE_SEAL','Khóa gói phát hành','Seal ReleasePackage theo thẩm quyền',clock_timestamp()),
('RELEASE_PACKAGE_READ','Đọc gói phát hành','Xem package và manifest',clock_timestamp());

CREATE TRIGGER tr_publishing_template_version_immutable BEFORE UPDATE OR DELETE ON legal_builder.publishing_template_version FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();
CREATE OR REPLACE FUNCTION legal_builder.guard_sealed_release_package() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.status_code IN('SEALED','SUPERSEDED') THEN RAISE EXCEPTION 'sealed release package is immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER tr_release_package_immutable BEFORE UPDATE OR DELETE ON legal_builder.release_package FOR EACH ROW EXECUTE FUNCTION legal_builder.guard_sealed_release_package();
CREATE OR REPLACE FUNCTION legal_builder.guard_sealed_release_package_item() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM legal_builder.release_package p WHERE p.id=OLD.package_id AND p.status_code IN('SEALED','SUPERSEDED')) THEN RAISE EXCEPTION 'sealed release package item is immutable'; END IF; RETURN COALESCE(NEW,OLD); END $$;
CREATE TRIGGER tr_release_package_item_immutable BEFORE UPDATE OR DELETE ON legal_builder.release_package_item FOR EACH ROW EXECUTE FUNCTION legal_builder.guard_sealed_release_package_item();

COMMIT;

BEGIN;

ALTER TABLE legal_builder.amendment_source_document
  ADD COLUMN source_role_code text NOT NULL DEFAULT 'AMENDMENT_TARGET',
  ADD CONSTRAINT ck_source_role CHECK(source_role_code IN('AMENDMENT_TARGET','LEGAL_BASIS','RELATED_DOCUMENT'));

CREATE TABLE legal_builder.source_import_file(
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
  source_document_id uuid NOT NULL REFERENCES legal_builder.amendment_source_document(id),
  source_version_id uuid NOT NULL UNIQUE REFERENCES legal_builder.amendment_source_version(id),
  original_filename text NOT NULL,
  media_type text NOT NULL,
  byte_size bigint NOT NULL,
  checksum_sha256 char(64) NOT NULL,
  storage_key text NOT NULL UNIQUE,
  collected_at timestamptz NOT NULL,
  source_url text,
  recorded_at timestamptz NOT NULL,
  recorded_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  CONSTRAINT ck_source_file_docx CHECK(media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  CONSTRAINT ck_source_file_name CHECK(lower(original_filename) LIKE '%.docx'),
  CONSTRAINT ck_source_file_size CHECK(byte_size>0),
  CONSTRAINT ck_source_file_checksum CHECK(checksum_sha256~'^[0-9A-Fa-f]{64}$')
);
CREATE TRIGGER tr_source_import_file_immutable BEFORE UPDATE OR DELETE ON legal_builder.source_import_file FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TABLE legal_builder.change_basis_link(
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
  draft_legal_node_id uuid NOT NULL,
  source_document_id uuid NOT NULL REFERENCES legal_builder.amendment_source_document(id),
  source_version_id uuid NOT NULL REFERENCES legal_builder.amendment_source_version(id),
  source_legal_node_id uuid,
  source_locator text,
  basis_role_code text NOT NULL,
  explanation text NOT NULL,
  verification_status_code text NOT NULL,
  recorded_at timestamptz NOT NULL,
  recorded_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  verified_at timestamptz,
  verified_by_user_id uuid REFERENCES legal_builder.user_account(id),
  CONSTRAINT fk_change_basis_source_node FOREIGN KEY(source_version_id,source_legal_node_id) REFERENCES legal_builder.amendment_source_node(source_version_id,legal_node_id),
  CONSTRAINT ck_change_basis_anchor CHECK(source_legal_node_id IS NOT NULL OR btrim(coalesce(source_locator,''))<>''),
  CONSTRAINT ck_change_basis_role CHECK(basis_role_code IN('MANDATORY_REQUIREMENT','PROPOSAL_BASIS','POLICY_EXPLANATION','DIRECTION','COMMENT','APPRAISAL')),
  CONSTRAINT ck_change_basis_verification CHECK(verification_status_code IN('UNVERIFIED','VERIFIED','REJECTED')),
  CONSTRAINT ck_change_basis_explanation CHECK(btrim(explanation)<>'')
);
CREATE TRIGGER tr_change_basis_link_immutable BEFORE UPDATE OR DELETE ON legal_builder.change_basis_link FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

ALTER TABLE legal_builder.amendment_operation
  ADD COLUMN draft_legal_node_id uuid;
CREATE INDEX ix_amendment_operation_draft_node
  ON legal_builder.amendment_operation(project_id,draft_legal_node_id,recorded_at);

INSERT INTO legal_builder.permission_definition(code,name,description,created_at)
VALUES('PROJECT_MANAGE','Quản lý thông tin hồ sơ','Đổi tên, mô tả và trạng thái vòng đời của hồ sơ',clock_timestamp());
INSERT INTO legal_builder.role_permission(role_definition_id,permission_code)
SELECT id,'PROJECT_MANAGE' FROM legal_builder.role_definition WHERE right(code,8)='_MANAGER'
ON CONFLICT DO NOTHING;

COMMIT;

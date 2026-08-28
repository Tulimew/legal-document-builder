BEGIN;

INSERT INTO legal_builder.permission_definition(code,name,description,created_at) VALUES
('AMENDMENT_TARGET_READ','Xem văn bản bị sửa đổi','Xem văn bản nguồn, phiên bản nguồn và ánh xạ thao tác sửa đổi',clock_timestamp()),
('AMENDMENT_TARGET_MANAGE','Quản lý văn bản bị sửa đổi','Thêm văn bản nguồn đã kiểm chứng vào phạm vi sửa đổi',clock_timestamp());

CREATE TABLE legal_builder.amendment_source_document(
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
  code text NOT NULL,
  title text NOT NULL,
  document_type_code text NOT NULL,
  identifying_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  CONSTRAINT uq_amendment_source_code UNIQUE(project_id,code),
  CONSTRAINT uq_amendment_source_id_project UNIQUE(id,project_id),
  CONSTRAINT ck_amendment_source_text CHECK(btrim(code)<>'' AND btrim(title)<>'' AND btrim(document_type_code)<>''),
  CONSTRAINT ck_amendment_source_metadata CHECK(jsonb_typeof(identifying_metadata)='object')
);

CREATE TABLE legal_builder.amendment_source_version(
  id uuid PRIMARY KEY,
  source_document_id uuid NOT NULL REFERENCES legal_builder.amendment_source_document(id),
  version_number integer NOT NULL,
  structured_snapshot jsonb NOT NULL,
  checksum_sha256 char(64) NOT NULL,
  verification_status_code text NOT NULL,
  source_description text NOT NULL,
  recorded_at timestamptz NOT NULL,
  recorded_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  verified_at timestamptz,
  verified_by_user_id uuid REFERENCES legal_builder.user_account(id),
  CONSTRAINT uq_amendment_source_version UNIQUE(source_document_id,version_number),
  CONSTRAINT uq_amendment_source_version_document UNIQUE(id,source_document_id),
  CONSTRAINT ck_amendment_source_version_positive CHECK(version_number>0),
  CONSTRAINT ck_amendment_source_snapshot CHECK(jsonb_typeof(structured_snapshot)='object'),
  CONSTRAINT ck_amendment_source_checksum CHECK(checksum_sha256~'^[0-9A-Fa-f]{64}$'),
  CONSTRAINT ck_amendment_source_verification CHECK(verification_status_code IN('UNVERIFIED','VERIFIED','REJECTED')),
  CONSTRAINT ck_amendment_source_verified_pair CHECK((verification_status_code='VERIFIED' AND verified_at IS NOT NULL AND verified_by_user_id IS NOT NULL) OR verification_status_code<>'VERIFIED')
);

CREATE TABLE legal_builder.amendment_source_node(
  source_version_id uuid NOT NULL REFERENCES legal_builder.amendment_source_version(id),
  legal_node_id uuid NOT NULL,
  node_type_code text NOT NULL,
  parent_node_id uuid,
  order_key text NOT NULL,
  display_number text,
  node_snapshot jsonb NOT NULL,
  PRIMARY KEY(source_version_id,legal_node_id),
  CONSTRAINT fk_amendment_source_node_parent FOREIGN KEY(source_version_id,parent_node_id) REFERENCES legal_builder.amendment_source_node(source_version_id,legal_node_id) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT ck_amendment_source_node_order CHECK(btrim(order_key)<>''),
  CONSTRAINT ck_amendment_source_node_snapshot CHECK(jsonb_typeof(node_snapshot)='object')
);

CREATE TABLE legal_builder.amendment_target(
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  source_document_id uuid NOT NULL,
  source_version_id uuid NOT NULL,
  target_order integer NOT NULL,
  status_code text NOT NULL,
  supersedes_target_id uuid REFERENCES legal_builder.amendment_target(id),
  created_at timestamptz NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  CONSTRAINT fk_amendment_target_document_project FOREIGN KEY(source_document_id,project_id) REFERENCES legal_builder.amendment_source_document(id,project_id),
  CONSTRAINT fk_amendment_target_version_document FOREIGN KEY(source_version_id,source_document_id) REFERENCES legal_builder.amendment_source_version(id,source_document_id),
  CONSTRAINT uq_amendment_target_order UNIQUE(project_id,target_order),
  CONSTRAINT ck_amendment_target_order CHECK(target_order>0),
  CONSTRAINT ck_amendment_target_status CHECK(status_code IN('ACTIVE','SUPERSEDED'))
);
CREATE UNIQUE INDEX uq_amendment_target_active_document ON legal_builder.amendment_target(project_id,source_document_id) WHERE status_code='ACTIVE';

CREATE TABLE legal_builder.amendment_operation(
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
  amendment_target_id uuid NOT NULL REFERENCES legal_builder.amendment_target(id),
  sequence integer NOT NULL,
  operation_type_code text NOT NULL,
  before_snapshot jsonb NOT NULL,
  proposed_content jsonb NOT NULL,
  anchor_configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  status_code text NOT NULL,
  effective_draft_version_id uuid REFERENCES legal_builder.draft_version(id),
  supersedes_operation_id uuid REFERENCES legal_builder.amendment_operation(id),
  recorded_at timestamptz NOT NULL,
  recorded_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  approved_at timestamptz,
  approved_by_user_id uuid REFERENCES legal_builder.user_account(id),
  CONSTRAINT uq_amendment_operation_sequence UNIQUE(amendment_target_id,sequence),
  CONSTRAINT ck_amendment_operation_sequence CHECK(sequence>0),
  CONSTRAINT ck_amendment_operation_type CHECK(operation_type_code IN('ADD','REPLACE','REPEAL','RENAME','MOVE','SPLIT','MERGE','REPLACE_PHRASE','REMOVE_PHRASE')),
  CONSTRAINT ck_amendment_operation_before CHECK(jsonb_typeof(before_snapshot)='object'),
  CONSTRAINT ck_amendment_operation_content CHECK(jsonb_typeof(proposed_content)='object'),
  CONSTRAINT ck_amendment_operation_anchor CHECK(jsonb_typeof(anchor_configuration)='object'),
  CONSTRAINT ck_amendment_operation_reason CHECK(btrim(reason)<>''),
  CONSTRAINT ck_amendment_operation_status CHECK(status_code IN('DRAFT','PROPOSED','CONFLICT','APPROVED','REJECTED')),
  CONSTRAINT ck_amendment_operation_approval CHECK((status_code='APPROVED' AND approved_at IS NOT NULL AND approved_by_user_id IS NOT NULL) OR status_code<>'APPROVED')
);

CREATE TABLE legal_builder.amendment_operation_target_node(
  operation_id uuid NOT NULL REFERENCES legal_builder.amendment_operation(id),
  source_version_id uuid NOT NULL,
  legal_node_id uuid NOT NULL,
  target_role_code text NOT NULL,
  PRIMARY KEY(operation_id,source_version_id,legal_node_id,target_role_code),
  CONSTRAINT fk_amendment_operation_node FOREIGN KEY(source_version_id,legal_node_id) REFERENCES legal_builder.amendment_source_node(source_version_id,legal_node_id),
  CONSTRAINT ck_amendment_operation_target_role CHECK(target_role_code IN('PRIMARY','ANCHOR','SOURCE'))
);

CREATE TABLE legal_builder.consolidated_projection(
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
  amendment_target_id uuid NOT NULL REFERENCES legal_builder.amendment_target(id),
  source_version_id uuid NOT NULL REFERENCES legal_builder.amendment_source_version(id),
  draft_version_id uuid NOT NULL REFERENCES legal_builder.draft_version(id),
  operation_ids jsonb NOT NULL,
  projected_snapshot jsonb NOT NULL,
  validation_result jsonb NOT NULL,
  status_code text NOT NULL,
  generated_at timestamptz NOT NULL,
  generated_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  CONSTRAINT ck_projection_operations CHECK(jsonb_typeof(operation_ids)='array'),
  CONSTRAINT ck_projection_snapshot CHECK(jsonb_typeof(projected_snapshot)='object'),
  CONSTRAINT ck_projection_validation CHECK(jsonb_typeof(validation_result)='object'),
  CONSTRAINT ck_projection_status CHECK(status_code IN('COMPLETE','INCOMPLETE','CONFLICT'))
);

CREATE TRIGGER tr_amendment_source_version_immutable BEFORE UPDATE OR DELETE ON legal_builder.amendment_source_version FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();
CREATE TRIGGER tr_amendment_source_node_immutable BEFORE UPDATE OR DELETE ON legal_builder.amendment_source_node FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();
CREATE TRIGGER tr_amendment_operation_immutable BEFORE UPDATE OR DELETE ON legal_builder.amendment_operation FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();
CREATE TRIGGER tr_amendment_operation_node_immutable BEFORE UPDATE OR DELETE ON legal_builder.amendment_operation_target_node FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();
CREATE TRIGGER tr_consolidated_projection_immutable BEFORE UPDATE OR DELETE ON legal_builder.consolidated_projection FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

COMMIT;

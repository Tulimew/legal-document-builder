BEGIN;
INSERT INTO legal_builder.permission_definition(code,name,description,created_at) VALUES
('STEP4_CHANGE_READ','Xem phiếu chỉnh lý Bước 4','Xem thay đổi phát sinh khi hoàn thiện dự thảo',clock_timestamp()),
('STEP4_CHANGE_CREATE','Tạo phiếu chỉnh lý Bước 4','Ghi thay đổi và nguồn phát sinh trong workspace',clock_timestamp()),
('STEP4_CHANGE_DECIDE','Duyệt phiếu chỉnh lý Bước 4','Duyệt, từ chối hoặc yêu cầu sửa phiếu thay đổi',clock_timestamp());
CREATE TABLE legal_builder.step4_change_proposal(
  id uuid PRIMARY KEY,project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),workspace_id uuid NOT NULL REFERENCES legal_builder.draft_workspace(id),legal_node_id uuid NOT NULL,location text NOT NULL,before_state jsonb NOT NULL,after_state jsonb NOT NULL,source_type_code text NOT NULL,source_reference text,reason text NOT NULL,authority_basis text,changes_meeting_conclusion boolean NOT NULL DEFAULT false,recorded_at timestamptz NOT NULL,recorded_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  CONSTRAINT fk_step4_workspace_node FOREIGN KEY(workspace_id,legal_node_id) REFERENCES legal_builder.workspace_legal_node(workspace_id,legal_node_id),CONSTRAINT ck_step4_location CHECK(btrim(location)<>''),CONSTRAINT ck_step4_states CHECK(jsonb_typeof(before_state)='object' AND jsonb_typeof(after_state)='object' AND before_state<>after_state),CONSTRAINT ck_step4_source CHECK(source_type_code IN('MEETING_CONCLUSION','TECHNICAL_EDIT','DRAFTING_TEAM_INITIATIVE','NEW_DIRECTION')),CONSTRAINT ck_step4_reference CHECK(source_type_code NOT IN('MEETING_CONCLUSION','NEW_DIRECTION') OR btrim(coalesce(source_reference,''))<>''),CONSTRAINT ck_step4_reason CHECK(btrim(reason)<>''),CONSTRAINT ck_step4_authority CHECK((source_type_code NOT IN('DRAFTING_TEAM_INITIATIVE','NEW_DIRECTION') AND NOT changes_meeting_conclusion) OR btrim(coalesce(authority_basis,''))<>'')
);
CREATE TABLE legal_builder.step4_change_decision(
  id uuid PRIMARY KEY,proposal_id uuid NOT NULL REFERENCES legal_builder.step4_change_proposal(id),sequence integer NOT NULL,decision_type_code text NOT NULL,reason text NOT NULL,authority_basis text NOT NULL,decided_at timestamptz NOT NULL,decided_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),decided_by_membership_id uuid NOT NULL REFERENCES legal_builder.project_membership(id),supersedes_decision_id uuid REFERENCES legal_builder.step4_change_decision(id),
  CONSTRAINT uq_step4_decision_sequence UNIQUE(proposal_id,sequence),CONSTRAINT ck_step4_decision_sequence CHECK(sequence>0),CONSTRAINT ck_step4_decision_type CHECK(decision_type_code IN('APPROVE','REJECT','REQUEST_REVISION')),CONSTRAINT ck_step4_decision_reason CHECK(btrim(reason)<>''),CONSTRAINT ck_step4_decision_authority CHECK(btrim(authority_basis)<>''),CONSTRAINT ck_step4_decision_supersede CHECK((sequence=1 AND supersedes_decision_id IS NULL) OR (sequence>1 AND supersedes_decision_id IS NOT NULL))
);
CREATE INDEX ix_step4_proposal_workspace_node ON legal_builder.step4_change_proposal(workspace_id,legal_node_id,recorded_at);
CREATE INDEX ix_step4_decision_proposal ON legal_builder.step4_change_decision(proposal_id,sequence DESC);
CREATE TRIGGER tr_step4_proposal_immutable BEFORE UPDATE OR DELETE ON legal_builder.step4_change_proposal FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();
CREATE TRIGGER tr_step4_decision_immutable BEFORE UPDATE OR DELETE ON legal_builder.step4_change_decision FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();
COMMIT;

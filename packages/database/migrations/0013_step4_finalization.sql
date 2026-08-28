BEGIN;
INSERT INTO legal_builder.permission_definition(code,name,description,created_at) VALUES('STEP4_FINALIZE','Chốt phiên bản sau Bước 4','Tạo checkpoint, DraftVersion và thay đổi truy nguyên từ các phiếu đã duyệt',clock_timestamp());
CREATE TABLE legal_builder.step4_finalization(
 id uuid PRIMARY KEY,project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),workspace_id uuid NOT NULL REFERENCES legal_builder.draft_workspace(id),source_workspace_revision bigint NOT NULL,parent_version_id uuid NOT NULL REFERENCES legal_builder.draft_version(id),effective_version_id uuid NOT NULL UNIQUE REFERENCES legal_builder.draft_version(id),checkpoint_id uuid NOT NULL UNIQUE REFERENCES legal_builder.draft_checkpoint(id),completion_report text NOT NULL,authority_basis text NOT NULL,finalized_at timestamptz NOT NULL,finalized_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),finalized_by_membership_id uuid NOT NULL REFERENCES legal_builder.project_membership(id),CONSTRAINT ck_step4_finalization_revision CHECK(source_workspace_revision>=0),CONSTRAINT ck_step4_finalization_report CHECK(btrim(completion_report)<>''),CONSTRAINT ck_step4_finalization_authority CHECK(btrim(authority_basis)<>'')
);
CREATE TABLE legal_builder.step4_finalization_proposal(
 finalization_id uuid NOT NULL REFERENCES legal_builder.step4_finalization(id) DEFERRABLE INITIALLY DEFERRED,proposal_id uuid NOT NULL UNIQUE REFERENCES legal_builder.step4_change_proposal(id),legal_change_id uuid NOT NULL UNIQUE REFERENCES legal_builder.draft_legal_node_change(id),application_order integer NOT NULL,PRIMARY KEY(finalization_id,proposal_id),UNIQUE(finalization_id,application_order),CONSTRAINT ck_step4_application_order CHECK(application_order>0)
);
CREATE INDEX ix_step4_finalization_workspace ON legal_builder.step4_finalization(workspace_id,finalized_at DESC);
CREATE TRIGGER tr_step4_finalization_immutable BEFORE UPDATE OR DELETE ON legal_builder.step4_finalization FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();
CREATE TRIGGER tr_step4_finalization_proposal_immutable BEFORE UPDATE OR DELETE ON legal_builder.step4_finalization_proposal FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();
COMMIT;

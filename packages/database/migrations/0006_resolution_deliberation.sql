BEGIN;

INSERT INTO legal_builder.permission_definition(code,name,description,created_at) VALUES
('RESOLUTION_OPINION_CREATE','Ghi quan điểm xử lý','Ghi quan điểm riêng của thành viên Tổ soạn thảo',clock_timestamp()),
('RESOLUTION_DECIDE','Kết luận phương án','Lựa chọn phương án và ghi kết luận có thẩm quyền',clock_timestamp());

CREATE TABLE legal_builder.resolution_case (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL,
    comment_id uuid NOT NULL,
    title text NOT NULL,
    status_code text NOT NULL,
    opened_at timestamptz NOT NULL,
    opened_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    closed_at timestamptz,
    CONSTRAINT fk_resolution_case_comment_project FOREIGN KEY (comment_id, project_id)
        REFERENCES legal_builder.comment(id, project_id),
    CONSTRAINT uq_resolution_case_comment UNIQUE (comment_id),
    CONSTRAINT uq_resolution_case_id_project UNIQUE (id, project_id),
    CONSTRAINT ck_resolution_case_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT ck_resolution_case_status CHECK (status_code IN ('OPEN','DECIDED','CLOSED')),
    CONSTRAINT ck_resolution_case_closed CHECK ((status_code = 'CLOSED' AND closed_at IS NOT NULL) OR status_code <> 'CLOSED')
);

CREATE TABLE legal_builder.member_resolution_opinion (
    id uuid PRIMARY KEY,
    resolution_case_id uuid NOT NULL REFERENCES legal_builder.resolution_case(id),
    member_membership_id uuid NOT NULL REFERENCES legal_builder.project_membership(id),
    sequence integer NOT NULL,
    proposed_resolution_type_code text NOT NULL,
    reasoning text NOT NULL,
    proposed_draft_content text,
    recorded_at timestamptz NOT NULL,
    recorded_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    supersedes_opinion_id uuid REFERENCES legal_builder.member_resolution_opinion(id),
    CONSTRAINT uq_member_opinion_sequence UNIQUE (resolution_case_id, member_membership_id, sequence),
    CONSTRAINT ck_member_opinion_sequence CHECK (sequence > 0),
    CONSTRAINT ck_member_opinion_resolution_type CHECK (proposed_resolution_type_code IN ('ACCEPTED_AND_UPDATED','PARTIALLY_ACCEPTED','EXPLAINED_NOT_ACCEPTED')),
    CONSTRAINT ck_member_opinion_reason_not_blank CHECK (btrim(reasoning) <> ''),
    CONSTRAINT ck_member_opinion_supersede CHECK ((sequence = 1 AND supersedes_opinion_id IS NULL) OR (sequence > 1 AND supersedes_opinion_id IS NOT NULL))
);

CREATE TABLE legal_builder.resolution_option (
    id uuid PRIMARY KEY,
    resolution_case_id uuid NOT NULL REFERENCES legal_builder.resolution_case(id),
    code text NOT NULL,
    proposed_resolution_type_code text NOT NULL,
    summary text NOT NULL,
    proposed_draft_content text,
    created_at timestamptz NOT NULL,
    created_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    CONSTRAINT uq_resolution_option_code UNIQUE (resolution_case_id, code),
    CONSTRAINT uq_resolution_option_id_case UNIQUE (id, resolution_case_id),
    CONSTRAINT ck_resolution_option_type CHECK (proposed_resolution_type_code IN ('ACCEPTED_AND_UPDATED','PARTIALLY_ACCEPTED','EXPLAINED_NOT_ACCEPTED')),
    CONSTRAINT ck_resolution_option_summary_not_blank CHECK (btrim(summary) <> '')
);

CREATE TABLE legal_builder.resolution_option_opinion (
    resolution_option_id uuid NOT NULL REFERENCES legal_builder.resolution_option(id),
    member_opinion_id uuid NOT NULL REFERENCES legal_builder.member_resolution_opinion(id),
    PRIMARY KEY (resolution_option_id, member_opinion_id)
);

CREATE TABLE legal_builder.resolution_decision (
    id uuid PRIMARY KEY,
    resolution_case_id uuid NOT NULL REFERENCES legal_builder.resolution_case(id),
    sequence integer NOT NULL,
    decision_type_code text NOT NULL,
    selected_option_id uuid,
    reason text NOT NULL,
    authority_basis text NOT NULL,
    drafting_instruction text,
    decided_at timestamptz NOT NULL,
    decided_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    decided_by_membership_id uuid NOT NULL REFERENCES legal_builder.project_membership(id),
    supersedes_decision_id uuid REFERENCES legal_builder.resolution_decision(id),
    CONSTRAINT uq_resolution_decision_sequence UNIQUE (resolution_case_id, sequence),
    CONSTRAINT fk_decision_selected_option FOREIGN KEY (selected_option_id, resolution_case_id)
        REFERENCES legal_builder.resolution_option(id, resolution_case_id),
    CONSTRAINT ck_resolution_decision_sequence CHECK (sequence > 0),
    CONSTRAINT ck_resolution_decision_type CHECK (decision_type_code IN ('SELECT_OPTION','KEEP_CURRENT','COMBINE','RESEARCH_MORE','SEEK_AUTHORITY')),
    CONSTRAINT ck_resolution_decision_option CHECK ((decision_type_code = 'SELECT_OPTION' AND selected_option_id IS NOT NULL) OR decision_type_code <> 'SELECT_OPTION'),
    CONSTRAINT ck_resolution_decision_reason_not_blank CHECK (btrim(reason) <> ''),
    CONSTRAINT ck_resolution_decision_authority_not_blank CHECK (btrim(authority_basis) <> ''),
    CONSTRAINT ck_resolution_decision_supersede CHECK ((sequence = 1 AND supersedes_decision_id IS NULL) OR (sequence > 1 AND supersedes_decision_id IS NOT NULL))
);

ALTER TABLE legal_builder.comment_resolution
    ADD COLUMN resolution_decision_id uuid UNIQUE REFERENCES legal_builder.resolution_decision(id);

CREATE TRIGGER tr_member_opinion_immutable BEFORE UPDATE OR DELETE ON legal_builder.member_resolution_opinion
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();
CREATE TRIGGER tr_resolution_option_immutable BEFORE UPDATE OR DELETE ON legal_builder.resolution_option
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();
CREATE TRIGGER tr_resolution_option_opinion_immutable BEFORE UPDATE OR DELETE ON legal_builder.resolution_option_opinion
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();
CREATE TRIGGER tr_resolution_decision_immutable BEFORE UPDATE OR DELETE ON legal_builder.resolution_decision
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

COMMIT;

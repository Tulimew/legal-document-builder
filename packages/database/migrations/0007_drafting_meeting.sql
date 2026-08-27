BEGIN;
CREATE TABLE legal_builder.drafting_meeting (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
    review_round_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    scheduled_at timestamptz NOT NULL,
    chair_membership_id uuid NOT NULL REFERENCES legal_builder.project_membership(id),
    status_code text NOT NULL,
    concluded_at timestamptz,
    recorded_at timestamptz NOT NULL,
    recorded_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    CONSTRAINT fk_meeting_round_project FOREIGN KEY (review_round_id, project_id) REFERENCES legal_builder.review_round(id, project_id),
    CONSTRAINT uq_meeting_code UNIQUE (project_id, code),
    CONSTRAINT ck_meeting_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT ck_meeting_status CHECK (status_code IN ('PLANNED','IN_PROGRESS','CONCLUDED')),
    CONSTRAINT ck_meeting_concluded CHECK ((status_code='CONCLUDED' AND concluded_at IS NOT NULL) OR (status_code<>'CONCLUDED' AND concluded_at IS NULL))
);
CREATE TABLE legal_builder.meeting_resolution_case (
    meeting_id uuid NOT NULL REFERENCES legal_builder.drafting_meeting(id),
    resolution_case_id uuid NOT NULL REFERENCES legal_builder.resolution_case(id),
    agenda_order integer NOT NULL,
    PRIMARY KEY (meeting_id,resolution_case_id),
    CONSTRAINT uq_meeting_agenda_order UNIQUE (meeting_id,agenda_order),
    CONSTRAINT ck_meeting_agenda_order CHECK (agenda_order>0)
);
CREATE TABLE legal_builder.meeting_participant (
    meeting_id uuid NOT NULL REFERENCES legal_builder.drafting_meeting(id),
    membership_id uuid NOT NULL REFERENCES legal_builder.project_membership(id),
    attendance_status_code text NOT NULL,
    PRIMARY KEY (meeting_id,membership_id),
    CONSTRAINT ck_meeting_attendance CHECK (attendance_status_code IN ('INVITED','PRESENT','ABSENT','EXCUSED'))
);
ALTER TABLE legal_builder.resolution_decision ADD COLUMN meeting_id uuid REFERENCES legal_builder.drafting_meeting(id);
COMMIT;

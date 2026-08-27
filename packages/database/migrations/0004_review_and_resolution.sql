BEGIN;

CREATE TABLE legal_builder.review_round (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
    source_draft_version_id uuid NOT NULL,
    round_type_code text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    opened_at timestamptz NOT NULL,
    opened_by_user_id uuid NOT NULL,
    closed_at timestamptz,
    CONSTRAINT uq_review_round_code UNIQUE (project_id, code),
    CONSTRAINT uq_review_round_id_project UNIQUE (id, project_id),
    CONSTRAINT uq_review_round_id_source_version UNIQUE (id, source_draft_version_id),
    CONSTRAINT fk_review_round_source_project FOREIGN KEY (source_draft_version_id, project_id)
        REFERENCES legal_builder.draft_version(id, project_id),
    CONSTRAINT ck_review_round_type CHECK (round_type_code IN ('CONSULTATION','MEETING','DIRECTION','REVISION','APPRAISAL')),
    CONSTRAINT ck_review_round_code_not_blank CHECK (btrim(code) <> ''),
    CONSTRAINT ck_review_round_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT ck_review_round_time CHECK (closed_at IS NULL OR closed_at >= opened_at)
);

CREATE TABLE legal_builder.comment (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL,
    review_round_id uuid NOT NULL,
    source_draft_version_id uuid NOT NULL,
    target_scope_type_code text NOT NULL,
    issue_group text NOT NULL,
    target_description text NOT NULL,
    contributor_organization_name text NOT NULL,
    comment_content text NOT NULL,
    received_at timestamptz NOT NULL,
    recorded_at timestamptz NOT NULL,
    recorded_by_user_id uuid NOT NULL,
    CONSTRAINT uq_comment_id_project UNIQUE (id, project_id),
    CONSTRAINT uq_comment_id_source_version UNIQUE (id, source_draft_version_id),
    CONSTRAINT fk_comment_round_project FOREIGN KEY (review_round_id, project_id)
        REFERENCES legal_builder.review_round(id, project_id),
    CONSTRAINT fk_comment_source_project FOREIGN KEY (source_draft_version_id, project_id)
        REFERENCES legal_builder.draft_version(id, project_id),
    CONSTRAINT fk_comment_round_source_version FOREIGN KEY (review_round_id, source_draft_version_id)
        REFERENCES legal_builder.review_round(id, source_draft_version_id),
    CONSTRAINT ck_comment_issue_not_blank CHECK (btrim(issue_group) <> ''),
    CONSTRAINT ck_comment_target_scope CHECK (target_scope_type_code IN ('SECTION','CHAPTER','ARTICLE','CLAUSE','POINT','OTHER')),
    CONSTRAINT ck_comment_target_not_blank CHECK (btrim(target_description) <> ''),
    CONSTRAINT ck_comment_org_not_blank CHECK (btrim(contributor_organization_name) <> ''),
    CONSTRAINT ck_comment_content_not_blank CHECK (btrim(comment_content) <> ''),
    CONSTRAINT ck_comment_recorded_after_received CHECK (recorded_at >= received_at)
);

CREATE TABLE legal_builder.comment_target_node (
    comment_id uuid NOT NULL REFERENCES legal_builder.comment(id),
    draft_version_id uuid NOT NULL,
    legal_node_id uuid NOT NULL,
    PRIMARY KEY (comment_id, legal_node_id),
    CONSTRAINT fk_comment_target_source_version FOREIGN KEY (comment_id, draft_version_id)
        REFERENCES legal_builder.comment(id, source_draft_version_id),
    CONSTRAINT fk_comment_target_version_node FOREIGN KEY (draft_version_id, legal_node_id)
        REFERENCES legal_builder.legal_node_version_state(draft_version_id, legal_node_id)
);

CREATE TABLE legal_builder.comment_resolution (
    id uuid PRIMARY KEY,
    comment_id uuid NOT NULL REFERENCES legal_builder.comment(id),
    sequence integer NOT NULL,
    resolution_type_code text NOT NULL,
    explanation text,
    effective_draft_version_id uuid REFERENCES legal_builder.draft_version(id),
    supersedes_resolution_id uuid REFERENCES legal_builder.comment_resolution(id),
    decided_at timestamptz NOT NULL,
    decided_by_user_id uuid NOT NULL,
    CONSTRAINT uq_comment_resolution_sequence UNIQUE (comment_id, sequence),
    CONSTRAINT uq_comment_resolution_id_comment UNIQUE (id, comment_id),
    CONSTRAINT ck_comment_resolution_sequence CHECK (sequence > 0),
    CONSTRAINT ck_comment_resolution_type CHECK (resolution_type_code IN (
        'ACCEPTED_AND_UPDATED','PARTIALLY_ACCEPTED','EXPLAINED_NOT_ACCEPTED'
    )),
    CONSTRAINT ck_comment_resolution_explanation CHECK (
        resolution_type_code <> 'EXPLAINED_NOT_ACCEPTED'
        OR btrim(coalesce(explanation, '')) <> ''
    ),
    CONSTRAINT ck_comment_resolution_updated_version CHECK (
        resolution_type_code = 'EXPLAINED_NOT_ACCEPTED'
        OR effective_draft_version_id IS NOT NULL
    ),
    CONSTRAINT ck_comment_resolution_supersede CHECK (
        (sequence = 1 AND supersedes_resolution_id IS NULL)
        OR (sequence > 1 AND supersedes_resolution_id IS NOT NULL)
    )
);

CREATE TABLE legal_builder.comment_resolution_change (
    resolution_id uuid NOT NULL REFERENCES legal_builder.comment_resolution(id),
    change_id uuid NOT NULL REFERENCES legal_builder.draft_legal_node_change(id),
    PRIMARY KEY (resolution_id, change_id)
);

CREATE INDEX ix_comment_project_round ON legal_builder.comment(project_id, review_round_id, recorded_at);
CREATE INDEX ix_comment_target_node ON legal_builder.comment_target_node(legal_node_id, draft_version_id);
CREATE INDEX ix_comment_resolution_comment ON legal_builder.comment_resolution(comment_id, sequence DESC);

CREATE TRIGGER tr_comment_immutable
BEFORE UPDATE OR DELETE ON legal_builder.comment
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER tr_comment_target_immutable
BEFORE UPDATE OR DELETE ON legal_builder.comment_target_node
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER tr_comment_resolution_immutable
BEFORE UPDATE OR DELETE ON legal_builder.comment_resolution
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER tr_comment_resolution_change_immutable
BEFORE UPDATE OR DELETE ON legal_builder.comment_resolution_change
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

COMMIT;

BEGIN;

ALTER TABLE legal_builder.draft_workspace
    ADD COLUMN source_relations jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD CONSTRAINT ck_workspace_source_relations_array
        CHECK (jsonb_typeof(source_relations) = 'array');

CREATE TABLE legal_builder.audit_event (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
    event_type_code text NOT NULL,
    aggregate_type_code text NOT NULL,
    aggregate_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    actor_person_id uuid,
    actor_membership_id uuid,
    actor_delegation_id uuid,
    correlation_id text NOT NULL,
    occurred_at timestamptz NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT ck_audit_event_type_not_blank CHECK (btrim(event_type_code) <> ''),
    CONSTRAINT ck_audit_aggregate_type_not_blank CHECK (btrim(aggregate_type_code) <> ''),
    CONSTRAINT ck_audit_correlation_not_blank CHECK (btrim(correlation_id) <> ''),
    CONSTRAINT ck_audit_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX ix_audit_event_project_occurred
    ON legal_builder.audit_event(project_id, occurred_at DESC);

CREATE INDEX ix_audit_event_aggregate
    ON legal_builder.audit_event(aggregate_type_code, aggregate_id, occurred_at DESC);

CREATE TRIGGER tr_audit_event_immutable
BEFORE UPDATE OR DELETE ON legal_builder.audit_event
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

COMMIT;

BEGIN;

CREATE TABLE legal_builder.security_rejection_event (
    id uuid PRIMARY KEY,
    project_id uuid REFERENCES legal_builder.legal_document_project(id),
    rejection_type_code text NOT NULL,
    correlation_id text NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_security_rejection_type CHECK (rejection_type_code IN ('ORIGIN','MEDIA_TYPE','BODY_LIMIT','AUTHENTICATION','AUTHORIZATION','OTHER')),
    CONSTRAINT ck_security_rejection_correlation CHECK (btrim(correlation_id) <> '' AND length(correlation_id) <= 128)
);

CREATE INDEX ix_security_rejection_project_occurred
    ON legal_builder.security_rejection_event(project_id, occurred_at DESC);

CREATE TRIGGER tr_security_rejection_immutable
BEFORE UPDATE OR DELETE ON legal_builder.security_rejection_event
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

COMMIT;

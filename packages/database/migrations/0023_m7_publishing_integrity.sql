BEGIN;

ALTER TABLE legal_builder.generated_document
  ADD COLUMN source_snapshot_checksum_sha256 char(64),
  ADD COLUMN source_ruleset_definition_id uuid,
  ADD COLUMN source_ruleset_version_id uuid,
  ADD COLUMN source_ruleset_version_code text,
  ADD COLUMN lineage jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE legal_builder.generated_document DISABLE TRIGGER tr_generated_document_immutable;
UPDATE legal_builder.generated_document g SET
  source_snapshot_checksum_sha256=v.snapshot_checksum_sha256,
  source_ruleset_definition_id=v.ruleset_definition_id,
  source_ruleset_version_id=v.ruleset_version_id,
  source_ruleset_version_code=v.ruleset_version_code,
  lineage=jsonb_build_object('source','IMMUTABLE_DRAFT_VERSION','backfillMigration','0023','evidenceDraftVersionId',v.id)
FROM legal_builder.draft_version v WHERE v.id=g.source_draft_version_id;
ALTER TABLE legal_builder.generated_document ENABLE TRIGGER tr_generated_document_immutable;

ALTER TABLE legal_builder.generated_document
  ALTER COLUMN source_snapshot_checksum_sha256 SET NOT NULL,
  ALTER COLUMN source_ruleset_definition_id SET NOT NULL,
  ALTER COLUMN source_ruleset_version_id SET NOT NULL,
  ALTER COLUMN source_ruleset_version_code SET NOT NULL,
  ADD CONSTRAINT ck_generated_document_source_checksum CHECK(source_snapshot_checksum_sha256~'^[0-9A-Fa-f]{64}$'),
  ADD CONSTRAINT ck_generated_document_verification CHECK(verification_status_code IN('VERIFIED','FAILED_VERIFICATION','MISSING')),
  ADD CONSTRAINT ck_generated_document_lineage CHECK(jsonb_typeof(lineage)='object');

CREATE TABLE legal_builder.supporting_document(
  id uuid PRIMARY KEY,project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
  code text NOT NULL,name text NOT NULL,media_type text NOT NULL,storage_key text NOT NULL UNIQUE,
  byte_size bigint NOT NULL,checksum_sha256 char(64) NOT NULL,status_code text NOT NULL,
  created_at timestamptz NOT NULL,created_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  UNIQUE(project_id,code),CONSTRAINT ck_supporting_document_size CHECK(byte_size>=0),
  CONSTRAINT ck_supporting_document_checksum CHECK(checksum_sha256~'^[0-9A-Fa-f]{64}$'),
  CONSTRAINT ck_supporting_document_status CHECK(status_code IN('AVAILABLE','FAILED_VERIFICATION')));
CREATE TRIGGER tr_supporting_document_immutable BEFORE UPDATE OR DELETE ON legal_builder.supporting_document FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TABLE legal_builder.publishing_storage_orphan(
  id uuid PRIMARY KEY,project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),job_id uuid NOT NULL REFERENCES legal_builder.publishing_job(id),
  storage_key text NOT NULL UNIQUE,byte_size bigint NOT NULL,checksum_sha256 char(64) NOT NULL,reason text NOT NULL,
  detected_at timestamptz NOT NULL,reconciled_at timestamptz,reconciliation_note text,
  CONSTRAINT ck_publishing_orphan_checksum CHECK(checksum_sha256~'^[0-9A-Fa-f]{64}$'));

CREATE TABLE legal_builder.generated_document_verification(
  id uuid PRIMARY KEY,generated_document_id uuid NOT NULL REFERENCES legal_builder.generated_document(id),
  status_code text NOT NULL,actual_byte_size bigint,actual_checksum_sha256 char(64),verified_at timestamptz NOT NULL,
  verified_by_user_id uuid REFERENCES legal_builder.user_account(id),details jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT ck_generated_verification_status CHECK(status_code IN('VERIFIED','FAILED_VERIFICATION','MISSING')),
  CONSTRAINT ck_generated_verification_details CHECK(jsonb_typeof(details)='object'));
CREATE TRIGGER tr_generated_document_verification_immutable BEFORE UPDATE OR DELETE ON legal_builder.generated_document_verification FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

ALTER TABLE legal_builder.release_package
  ADD CONSTRAINT ck_release_package_sealed_fields CHECK(
    (status_code='DRAFT' AND manifest IS NULL AND manifest_checksum_sha256 IS NULL AND sealed_at IS NULL)
    OR (status_code IN('SEALED','SUPERSEDED') AND manifest IS NOT NULL AND manifest_checksum_sha256~'^[0-9A-Fa-f]{64}$' AND sealed_at IS NOT NULL AND btrim(coalesce(authority_basis,''))<>''));

CREATE OR REPLACE FUNCTION legal_builder.guard_publishing_job_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status_code='SUCCEEDED' OR OLD.status_code IN('FAILED','CANCELLED') THEN RAISE EXCEPTION 'terminal publishing job is immutable'; END IF;
  IF OLD.status_code=NEW.status_code THEN RETURN NEW; END IF;
  IF NOT ((OLD.status_code='QUEUED' AND NEW.status_code IN('RUNNING','CANCELLED')) OR
          (OLD.status_code='RUNNING' AND NEW.status_code IN('RUNNING','QUEUED','SUCCEEDED','FAILED'))) THEN
    RAISE EXCEPTION 'invalid publishing job transition % -> %',OLD.status_code,NEW.status_code;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tr_publishing_job_transition BEFORE UPDATE ON legal_builder.publishing_job FOR EACH ROW EXECUTE FUNCTION legal_builder.guard_publishing_job_transition();

COMMIT;

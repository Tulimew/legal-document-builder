BEGIN;

ALTER TABLE legal_builder.draft_checkpoint
  ADD COLUMN snapshot_checksum_algorithm_code text NOT NULL DEFAULT 'LEGACY_JSON_STRINGIFY_SHA256',
  ADD CONSTRAINT ck_checkpoint_checksum_algorithm CHECK (
    snapshot_checksum_algorithm_code IN ('LEGACY_JSON_STRINGIFY_SHA256', 'CANONICAL_JSON_V1_SHA256')
  );

ALTER TABLE legal_builder.draft_version
  ADD COLUMN snapshot_checksum_algorithm_code text NOT NULL DEFAULT 'LEGACY_JSON_STRINGIFY_SHA256',
  ADD CONSTRAINT ck_version_checksum_algorithm CHECK (
    snapshot_checksum_algorithm_code IN ('LEGACY_JSON_STRINGIFY_SHA256', 'CANONICAL_JSON_V1_SHA256')
  );

COMMENT ON COLUMN legal_builder.draft_checkpoint.snapshot_checksum_algorithm_code IS
  'Legacy rows retain their original checksum without rewriting immutable history. New snapshots use CANONICAL_JSON_V1_SHA256.';
COMMENT ON COLUMN legal_builder.draft_version.snapshot_checksum_algorithm_code IS
  'Legacy rows retain their original checksum without rewriting immutable history. New snapshots use CANONICAL_JSON_V1_SHA256.';

COMMIT;

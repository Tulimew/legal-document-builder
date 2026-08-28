BEGIN;

ALTER TABLE legal_builder.amendment_target
  ADD CONSTRAINT uq_amendment_target_scope UNIQUE(id,source_version_id,project_id);

ALTER TABLE legal_builder.amendment_operation
  ADD COLUMN source_version_id uuid;

UPDATE legal_builder.amendment_operation o SET source_version_id=t.source_version_id
FROM legal_builder.amendment_target t WHERE t.id=o.amendment_target_id;

ALTER TABLE legal_builder.amendment_operation
  ALTER COLUMN source_version_id SET NOT NULL,
  ADD CONSTRAINT fk_amendment_operation_target_scope FOREIGN KEY(amendment_target_id,source_version_id,project_id)
    REFERENCES legal_builder.amendment_target(id,source_version_id,project_id);

ALTER TABLE legal_builder.consolidated_projection
  ADD CONSTRAINT fk_consolidated_projection_target_scope FOREIGN KEY(amendment_target_id,source_version_id,project_id)
    REFERENCES legal_builder.amendment_target(id,source_version_id,project_id);

COMMIT;

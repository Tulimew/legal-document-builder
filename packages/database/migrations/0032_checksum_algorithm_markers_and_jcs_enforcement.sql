-- =============================================================================
-- DESIGN DRAFT — ULH TASK-002-DESIGN-R4 FINAL AUDIT REMEDIATION (R4-REV1)
--   0032_checksum_algorithm_markers_and_jcs.sql
--
-- Prerequisites (MUST be executed beforehand via DBA Provisioning Script):
--   1. Roles ulh_migrator, ulh_app_runtime, ulh_reconciler, ulh_governance_approver exist.
--   2. Schema legal_builder and ALL existing tables/functions are owned by ulh_migrator.
--   3. EXECUTE FROM PUBLIC has been revoked on ALL existing functions in legal_builder.
--   4. Executed as ulh_migrator via app/web/scripts/migrate.mjs (external transaction;
--      NO BEGIN/COMMIT inside this file).
--
-- Data preservation & immutability invariants:
--   - ZERO BUSINESS DATA DESTRUCTION (NO DELETE, NO TRUNCATE, NO DROP TABLE).
--   - ZERO DISABLE TRIGGER on any table.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Fail-Closed Role, Ownership & Function-ACL Precondition,
--    Alphabetical Table Lock & Drain Gate
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_role text;
  v_missing text[] := ARRAY[]::text[];
  v_bad_table_owner_count bigint;
  v_bad_func_owner_count bigint;
  v_public_func_exec_count bigint;
BEGIN
  IF current_user <> 'ulh_migrator' THEN
    RAISE EXCEPTION
      'MIGRATION 0032 PRECONDITION FAILED: must execute as ulh_migrator (current_user: %). Run DBA Provisioning Script first.',
      current_user
      USING ERRCODE = '42501';
  END IF;

  FOREACH v_role IN ARRAY ARRAY['ulh_migrator', 'ulh_app_runtime', 'ulh_reconciler', 'ulh_governance_approver'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = v_role) THEN
      v_missing := pg_catalog.array_append(v_missing, v_role);
    END IF;
  END LOOP;

  IF pg_catalog.cardinality(v_missing) > 0 THEN
    RAISE EXCEPTION
      'MIGRATION 0032 PRECONDITION FAILED: missing required roles %. Execute DBA Provisioning Script before applying 0032.',
      pg_catalog.array_to_string(v_missing, ', ')
      USING ERRCODE = '55000';
  END IF;

  SELECT count(*) INTO v_bad_table_owner_count
  FROM pg_catalog.pg_tables
  WHERE schemaname = 'legal_builder' AND tableowner <> 'ulh_migrator';

  IF v_bad_table_owner_count > 0 THEN
    RAISE EXCEPTION
      'MIGRATION 0032 PRECONDITION FAILED: % table(s) in schema legal_builder are not owned by ulh_migrator.',
      v_bad_table_owner_count
      USING ERRCODE = '55000';
  END IF;

  SELECT count(*) INTO v_bad_func_owner_count
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'legal_builder'
    AND pg_catalog.pg_get_userbyid(p.proowner) <> 'ulh_migrator';

  IF v_bad_func_owner_count > 0 THEN
    RAISE EXCEPTION
      'MIGRATION 0032 PRECONDITION FAILED: % function(s) in schema legal_builder are not owned by ulh_migrator.',
      v_bad_func_owner_count
      USING ERRCODE = '55000';
  END IF;

  SELECT count(*) INTO v_public_func_exec_count
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'legal_builder'
    AND pg_catalog.has_function_privilege('public', p.oid, 'EXECUTE');

  IF v_public_func_exec_count > 0 THEN
    RAISE EXCEPTION
      'MIGRATION 0032 PRECONDITION FAILED: % existing function(s) in schema legal_builder still grant EXECUTE to PUBLIC.',
      v_public_func_exec_count
      USING ERRCODE = '55000';
  END IF;
END $$;

LOCK TABLE
  legal_builder.amendment_source_version,
  legal_builder.audit_event,
  legal_builder.draft_checkpoint,
  legal_builder.draft_merge_conflict,
  legal_builder.draft_merge_conflict_resolution,
  legal_builder.draft_merge_operation,
  legal_builder.draft_version,
  legal_builder.publishing_job,
  legal_builder.release_package,
  legal_builder.release_package_item,
  legal_builder.system_audit_event
IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  v_open_merges bigint;
  v_active_jobs bigint;
BEGIN
  SELECT count(*) INTO v_open_merges
  FROM legal_builder.draft_merge_operation
  WHERE status_code IN ('CONFLICTS_OPEN', 'READY');

  IF v_open_merges > 0 THEN
    RAISE EXCEPTION
      'MIGRATION 0032 ABORTED (DRAIN GATE): % open draft_merge_operation(s) in CONFLICTS_OPEN/READY must be completed or audited-abandoned before cutover.',
      v_open_merges
      USING ERRCODE = '55000';
  END IF;

  SELECT count(*) INTO v_active_jobs
  FROM legal_builder.publishing_job
  WHERE status_code IN ('QUEUED', 'RUNNING');

  IF v_active_jobs > 0 THEN
    RAISE EXCEPTION
      'MIGRATION 0032 ABORTED (DRAIN GATE): % active publishing_job(s) in QUEUED/RUNNING must drain before cutover.',
      v_active_jobs
      USING ERRCODE = '55000';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. Reusable BEFORE INSERT guard enforcing RFC8785_JCS on ALL new rows
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION legal_builder.enforce_new_checksum_algorithm_jcs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  v_col text;
  v_val text;
BEGIN
  FOREACH v_col IN ARRAY TG_ARGV LOOP
    EXECUTE pg_catalog.format('SELECT ($1).%I', v_col) INTO v_val USING NEW;
    IF v_val IS DISTINCT FROM 'RFC8785_JCS' THEN
      RAISE EXCEPTION
        'New row in %.% must use checksum algorithm RFC8785_JCS in column % (received: %)',
        TG_TABLE_SCHEMA, TG_TABLE_NAME, v_col, COALESCE(v_val, '<NULL>')
        USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

-- -----------------------------------------------------------------------------
-- 2. BLOCKER-DB-01: draft_checkpoint & draft_version (0001 & 0014)
-- -----------------------------------------------------------------------------
ALTER TABLE legal_builder.draft_checkpoint
  DROP CONSTRAINT ck_checkpoint_checksum_algorithm,
  ADD CONSTRAINT ck_checkpoint_checksum_algorithm CHECK (
    snapshot_checksum_algorithm_code IN (
      'LEGACY_JSON_STRINGIFY_SHA256',
      'CANONICAL_JSON_V1_SHA256',
      'RFC8785_JCS'
    )
  ),
  ALTER COLUMN snapshot_checksum_algorithm_code DROP DEFAULT;

CREATE TRIGGER tr_draft_checkpoint_jcs_insert_guard
  BEFORE INSERT ON legal_builder.draft_checkpoint
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.enforce_new_checksum_algorithm_jcs('snapshot_checksum_algorithm_code');

CREATE TRIGGER tr_draft_checkpoint_no_truncate
  BEFORE TRUNCATE ON legal_builder.draft_checkpoint
  FOR EACH STATEMENT
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

ALTER TABLE legal_builder.draft_version
  DROP CONSTRAINT ck_version_checksum_algorithm,
  ADD CONSTRAINT ck_version_checksum_algorithm CHECK (
    snapshot_checksum_algorithm_code IN (
      'LEGACY_JSON_STRINGIFY_SHA256',
      'CANONICAL_JSON_V1_SHA256',
      'RFC8785_JCS'
    )
  ),
  ALTER COLUMN snapshot_checksum_algorithm_code DROP DEFAULT;

CREATE TRIGGER tr_draft_version_jcs_insert_guard
  BEFORE INSERT ON legal_builder.draft_version
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.enforce_new_checksum_algorithm_jcs('snapshot_checksum_algorithm_code');

CREATE TRIGGER tr_draft_version_no_truncate
  BEFORE TRUNCATE ON legal_builder.draft_version
  FOR EACH STATEMENT
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

-- -----------------------------------------------------------------------------
-- 3. amendment_source_version (0009)
-- -----------------------------------------------------------------------------
ALTER TABLE legal_builder.amendment_source_version
  ADD COLUMN checksum_algorithm_code text NOT NULL DEFAULT 'UNCLASSIFIED_PRE_0032',
  ADD CONSTRAINT ck_amendment_source_checksum_algorithm CHECK (
    checksum_algorithm_code IN (
      'UNCLASSIFIED_PRE_0032',
      'LEGACY_JSON_STRINGIFY_SHA256',
      'CANONICAL_JSON_V1_SHA256',
      'RFC8785_JCS'
    )
  );

ALTER TABLE legal_builder.amendment_source_version
  ALTER COLUMN checksum_algorithm_code DROP DEFAULT;

CREATE TRIGGER tr_amendment_source_version_jcs_insert_guard
  BEFORE INSERT ON legal_builder.amendment_source_version
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.enforce_new_checksum_algorithm_jcs('checksum_algorithm_code');

CREATE TRIGGER tr_amendment_source_version_no_truncate
  BEFORE TRUNCATE ON legal_builder.amendment_source_version
  FOR EACH STATEMENT
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

-- -----------------------------------------------------------------------------
-- 4. C-04: draft_merge_operation, draft_merge_conflict &
--    draft_merge_conflict_resolution (0016 & 0018)
--    - Serialized via Parent-Anchor FOR UPDATE on draft_merge_operation.
--    - preview_checksum_sha256 changes bound to DB-maintained monotonic
--      preview_resolution_watermark requiring a NEW resolution row.
-- -----------------------------------------------------------------------------
ALTER TABLE legal_builder.draft_merge_operation
  ADD COLUMN input_checksum_algorithm_code text NOT NULL DEFAULT 'UNCLASSIFIED_PRE_0032',
  ADD COLUMN preview_checksum_algorithm_code text NOT NULL DEFAULT 'UNCLASSIFIED_PRE_0032',
  ADD COLUMN preview_resolution_watermark integer NOT NULL DEFAULT 0,
  ADD CONSTRAINT ck_merge_input_checksum_algorithm CHECK (
    input_checksum_algorithm_code IN (
      'UNCLASSIFIED_PRE_0032',
      'CANONICAL_JSON_V1_SHA256',
      'RFC8785_JCS'
    )
  ),
  ADD CONSTRAINT ck_merge_preview_checksum_algorithm CHECK (
    preview_checksum_algorithm_code IN (
      'UNCLASSIFIED_PRE_0032',
      'CANONICAL_JSON_V1_SHA256',
      'RFC8785_JCS'
    )
  ),
  ADD CONSTRAINT ck_merge_checksum_algorithm_consistent CHECK (
    input_checksum_algorithm_code = preview_checksum_algorithm_code
  ),
  ADD CONSTRAINT ck_merge_preview_resolution_watermark_nonneg CHECK (
    preview_resolution_watermark >= 0
  ),
  ADD CONSTRAINT ck_merge_abandoned_reason_clean CHECK (
    (status_code = 'ABANDONED' AND btrim(COALESCE(abandoned_reason, '')) <> '')
    OR (status_code <> 'ABANDONED' AND abandoned_reason IS NULL)
  );

-- Backfill historical watermark before attaching immutability trigger (NO DISABLE TRIGGER needed).
UPDATE legal_builder.draft_merge_operation m
SET preview_resolution_watermark = (
  SELECT count(*)::integer
  FROM legal_builder.draft_merge_conflict c
  JOIN legal_builder.draft_merge_conflict_resolution r ON r.conflict_id = c.id
  WHERE c.merge_operation_id = m.id
);

ALTER TABLE legal_builder.draft_merge_operation
  ALTER COLUMN input_checksum_algorithm_code DROP DEFAULT,
  ALTER COLUMN preview_checksum_algorithm_code DROP DEFAULT;

CREATE TRIGGER tr_merge_operation_jcs_insert_guard
  BEFORE INSERT ON legal_builder.draft_merge_operation
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.enforce_new_checksum_algorithm_jcs(
    'input_checksum_algorithm_code',
    'preview_checksum_algorithm_code'
  );

CREATE OR REPLACE FUNCTION legal_builder.guard_merge_operation_watermark_init()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.preview_resolution_watermark IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'new draft_merge_operation % must start with preview_resolution_watermark = 0 (received: %)',
      NEW.id, COALESCE(NEW.preview_resolution_watermark::text, '<NULL>')
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tr_merge_operation_watermark_init_guard
  BEFORE INSERT ON legal_builder.draft_merge_operation
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.guard_merge_operation_watermark_init();

CREATE OR REPLACE FUNCTION legal_builder.guard_merge_operation_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  v_res_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'draft_merge_operation does not allow DELETE (row %)', OLD.id
      USING ERRCODE = '55000';
  END IF;

  IF OLD.status_code IN ('COMPLETED', 'ABANDONED') THEN
    RAISE EXCEPTION 'terminal draft_merge_operation % (%) is immutable', OLD.id, OLD.status_code
      USING ERRCODE = '55000';
  END IF;

  -- Block any caller attempt to directly mutate the DB-managed watermark
  IF NEW.preview_resolution_watermark IS DISTINCT FROM OLD.preview_resolution_watermark THEN
    RAISE EXCEPTION 'preview_resolution_watermark on draft_merge_operation % is DB-managed and cannot be modified directly', OLD.id
      USING ERRCODE = '55000';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.target_branch_id IS DISTINCT FROM OLD.target_branch_id
     OR NEW.target_workspace_id IS DISTINCT FROM OLD.target_workspace_id
     OR NEW.base_version_id IS DISTINCT FROM OLD.base_version_id
     OR NEW.ours_version_id IS DISTINCT FROM OLD.ours_version_id
     OR NEW.theirs_version_id IS DISTINCT FROM OLD.theirs_version_id
     OR NEW.analysis_algorithm_code IS DISTINCT FROM OLD.analysis_algorithm_code
     OR NEW.analysis_algorithm_version IS DISTINCT FROM OLD.analysis_algorithm_version
     OR NEW.input_checksum_sha256 IS DISTINCT FROM OLD.input_checksum_sha256
     OR NEW.input_checksum_algorithm_code IS DISTINCT FROM OLD.input_checksum_algorithm_code
     OR NEW.preview_checksum_algorithm_code IS DISTINCT FROM OLD.preview_checksum_algorithm_code
     OR NEW.target_workspace_revision IS DISTINCT FROM OLD.target_workspace_revision
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.authority_basis IS DISTINCT FROM OLD.authority_basis
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
     OR NEW.created_by_membership_id IS DISTINCT FROM OLD.created_by_membership_id THEN
    RAISE EXCEPTION 'immutable identity/input/marker fields on draft_merge_operation % cannot be modified', OLD.id
      USING ERRCODE = '55000';
  END IF;

  IF NOT (
    (OLD.status_code = 'CONFLICTS_OPEN' AND NEW.status_code IN ('CONFLICTS_OPEN', 'READY', 'ABANDONED'))
    OR (OLD.status_code = 'READY' AND NEW.status_code IN ('READY', 'COMPLETED', 'ABANDONED'))
  ) THEN
    RAISE EXCEPTION 'invalid draft_merge_operation transition % -> % (row %)',
      OLD.status_code, NEW.status_code, OLD.id
      USING ERRCODE = '55000';
  END IF;

  IF NEW.status_code IN ('READY', 'COMPLETED') AND EXISTS (
    SELECT 1
    FROM legal_builder.draft_merge_conflict c
    WHERE c.merge_operation_id = OLD.id
      AND NOT EXISTS (
        SELECT 1
        FROM legal_builder.draft_merge_conflict_resolution r
        WHERE r.conflict_id = c.id
      )
  ) THEN
    RAISE EXCEPTION 'draft_merge_operation % cannot enter % while unresolved conflicts remain',
      OLD.id, NEW.status_code
      USING ERRCODE = '55000';
  END IF;

  IF NEW.preview_checksum_sha256 IS DISTINCT FROM OLD.preview_checksum_sha256 THEN
    IF NEW.status_code NOT IN ('CONFLICTS_OPEN', 'READY') THEN
      RAISE EXCEPTION 'preview_checksum_sha256 on draft_merge_operation % cannot change during terminal transition to %',
        OLD.id, NEW.status_code
        USING ERRCODE = '55000';
    END IF;
    IF OLD.input_checksum_algorithm_code <> 'RFC8785_JCS'
       OR OLD.preview_checksum_algorithm_code <> 'RFC8785_JCS' THEN
      RAISE EXCEPTION 'preview_checksum_sha256 on non-JCS draft_merge_operation % cannot be updated post-0032',
        OLD.id
        USING ERRCODE = '55000';
    END IF;

    SELECT count(*)::integer INTO v_res_count
    FROM legal_builder.draft_merge_conflict c
    JOIN legal_builder.draft_merge_conflict_resolution r ON r.conflict_id = c.id
    WHERE c.merge_operation_id = OLD.id;

    IF v_res_count <= OLD.preview_resolution_watermark THEN
      RAISE EXCEPTION 'preview_checksum_sha256 on draft_merge_operation % cannot change without a new conflict resolution (resolutions=%, watermark=%)',
        OLD.id, v_res_count, OLD.preview_resolution_watermark
        USING ERRCODE = '55000';
    END IF;

    NEW.preview_resolution_watermark := v_res_count;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER tr_merge_operation_immutability_guard
  BEFORE UPDATE OR DELETE ON legal_builder.draft_merge_operation
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.guard_merge_operation_immutability();

CREATE TRIGGER tr_merge_operation_no_truncate
  BEFORE TRUNCATE ON legal_builder.draft_merge_operation
  FOR EACH STATEMENT
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

ALTER TABLE legal_builder.draft_merge_conflict
  ADD COLUMN evidence_checksum_algorithm_code text NOT NULL DEFAULT 'UNCLASSIFIED_PRE_0032',
  ADD CONSTRAINT ck_merge_conflict_checksum_algorithm CHECK (
    evidence_checksum_algorithm_code IN (
      'UNCLASSIFIED_PRE_0032',
      'CANONICAL_JSON_V1_SHA256',
      'RFC8785_JCS'
    )
  );

ALTER TABLE legal_builder.draft_merge_conflict
  ALTER COLUMN evidence_checksum_algorithm_code DROP DEFAULT;

CREATE TRIGGER tr_merge_conflict_jcs_insert_guard
  BEFORE INSERT ON legal_builder.draft_merge_conflict
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.enforce_new_checksum_algorithm_jcs('evidence_checksum_algorithm_code');

CREATE OR REPLACE FUNCTION legal_builder.guard_merge_conflict_parent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  v_parent record;
BEGIN
  SELECT id, status_code, input_checksum_algorithm_code
  INTO v_parent
  FROM legal_builder.draft_merge_operation
  WHERE id = NEW.merge_operation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'parent draft_merge_operation % does not exist', NEW.merge_operation_id
      USING ERRCODE = '23503';
  END IF;

  IF v_parent.status_code <> 'CONFLICTS_OPEN' THEN
    RAISE EXCEPTION 'cannot insert draft_merge_conflict into draft_merge_operation % in status %',
      NEW.merge_operation_id, v_parent.status_code
      USING ERRCODE = '55000';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM legal_builder.draft_merge_conflict c
    JOIN legal_builder.draft_merge_conflict_resolution r ON r.conflict_id = c.id
    WHERE c.merge_operation_id = NEW.merge_operation_id
  ) THEN
    RAISE EXCEPTION 'cannot insert new draft_merge_conflict into draft_merge_operation % after conflict resolution has started',
      NEW.merge_operation_id
      USING ERRCODE = '55000';
  END IF;

  IF NEW.evidence_checksum_algorithm_code IS DISTINCT FROM v_parent.input_checksum_algorithm_code THEN
    RAISE EXCEPTION 'draft_merge_conflict algorithm % does not match parent draft_merge_operation algorithm %',
      NEW.evidence_checksum_algorithm_code, v_parent.input_checksum_algorithm_code
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER tr_merge_conflict_parent_guard
  BEFORE INSERT ON legal_builder.draft_merge_conflict
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.guard_merge_conflict_parent();

CREATE TRIGGER tr_merge_conflict_no_truncate
  BEFORE TRUNCATE ON legal_builder.draft_merge_conflict
  FOR EACH STATEMENT
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE OR REPLACE FUNCTION legal_builder.guard_merge_resolution_open_operation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  v_parent record;
BEGIN
  SELECT m.id, m.status_code, m.preview_checksum_algorithm_code
  INTO v_parent
  FROM legal_builder.draft_merge_conflict c
  JOIN legal_builder.draft_merge_operation m ON m.id = c.merge_operation_id
  WHERE c.id = NEW.conflict_id
  FOR UPDATE OF m;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'parent draft_merge_conflict % does not exist', NEW.conflict_id
      USING ERRCODE = '23503';
  END IF;

  IF v_parent.status_code NOT IN ('CONFLICTS_OPEN', 'READY') THEN
    RAISE EXCEPTION 'cannot insert draft_merge_conflict_resolution for closed merge_operation % (%)',
      v_parent.id, v_parent.status_code
      USING ERRCODE = '55000';
  END IF;

  IF v_parent.preview_checksum_algorithm_code <> 'RFC8785_JCS' THEN
    RAISE EXCEPTION 'cannot append resolution to non-JCS merge_operation % post-0032', v_parent.id
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER tr_merge_resolution_open_op_guard
  BEFORE INSERT ON legal_builder.draft_merge_conflict_resolution
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.guard_merge_resolution_open_operation();

CREATE TRIGGER tr_merge_resolution_no_truncate
  BEFORE TRUNCATE ON legal_builder.draft_merge_conflict_resolution
  FOR EACH STATEMENT
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

-- -----------------------------------------------------------------------------
-- 5. publishing_job (0020 & 0023)
-- -----------------------------------------------------------------------------
ALTER TABLE legal_builder.publishing_job
  ADD COLUMN input_fingerprint_algorithm_code text NOT NULL DEFAULT 'UNCLASSIFIED_PRE_0032',
  ADD CONSTRAINT ck_publishing_job_fingerprint_algorithm CHECK (
    input_fingerprint_algorithm_code IN (
      'UNCLASSIFIED_PRE_0032',
      'CANONICAL_JSON_V1_SHA256',
      'RFC8785_JCS'
    )
  );

ALTER TABLE legal_builder.publishing_job
  ALTER COLUMN input_fingerprint_algorithm_code DROP DEFAULT;

CREATE OR REPLACE FUNCTION legal_builder.guard_publishing_job_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF OLD.status_code = 'SUCCEEDED' OR OLD.status_code IN ('FAILED', 'CANCELLED') THEN
    RAISE EXCEPTION 'terminal publishing job is immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.artifact_kind_code IS DISTINCT FROM OLD.artifact_kind_code
     OR NEW.source_draft_version_id IS DISTINCT FROM OLD.source_draft_version_id
     OR NEW.template_version_id IS DISTINCT FROM OLD.template_version_id
     OR NEW.input_descriptor IS DISTINCT FROM OLD.input_descriptor
     OR NEW.input_fingerprint_sha256 IS DISTINCT FROM OLD.input_fingerprint_sha256
     OR NEW.input_fingerprint_algorithm_code IS DISTINCT FROM OLD.input_fingerprint_algorithm_code
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.max_attempts IS DISTINCT FROM OLD.max_attempts
     OR NEW.requested_at IS DISTINCT FROM OLD.requested_at
     OR NEW.requested_by_user_id IS DISTINCT FROM OLD.requested_by_user_id
     OR NEW.requested_by_membership_id IS DISTINCT FROM OLD.requested_by_membership_id
     OR NEW.correlation_id IS DISTINCT FROM OLD.correlation_id THEN
    RAISE EXCEPTION 'immutable input/identity/marker fields on publishing_job % cannot be modified', OLD.id
      USING ERRCODE = '55000';
  END IF;

  IF NEW.attempts < OLD.attempts THEN
    RAISE EXCEPTION 'publishing_job % attempts cannot decrease (% -> %)', OLD.id, OLD.attempts, NEW.attempts
      USING ERRCODE = '55000';
  END IF;

  IF OLD.started_at IS NOT NULL AND NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'publishing_job % started_at is immutable once set', OLD.id
      USING ERRCODE = '55000';
  END IF;

  IF NEW.status_code IN ('QUEUED', 'RUNNING') AND NEW.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'non-terminal publishing_job % (%) cannot have completed_at set', OLD.id, NEW.status_code
      USING ERRCODE = '55000';
  END IF;

  IF OLD.status_code = NEW.status_code THEN
    IF OLD.status_code = 'RUNNING' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'invalid publishing job transition % -> %', OLD.status_code, NEW.status_code
      USING ERRCODE = '55000';
  END IF;

  IF NOT (
    (OLD.status_code = 'QUEUED' AND NEW.status_code IN ('RUNNING', 'CANCELLED'))
    OR (OLD.status_code = 'RUNNING' AND NEW.status_code IN ('QUEUED', 'SUCCEEDED', 'FAILED'))
  ) THEN
    RAISE EXCEPTION 'invalid publishing job transition % -> %', OLD.status_code, NEW.status_code
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER tr_publishing_job_no_delete
  BEFORE DELETE ON legal_builder.publishing_job
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER tr_publishing_job_no_truncate
  BEFORE TRUNCATE ON legal_builder.publishing_job
  FOR EACH STATEMENT
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER tr_publishing_job_jcs_insert_guard
  BEFORE INSERT ON legal_builder.publishing_job
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.enforce_new_checksum_algorithm_jcs('input_fingerprint_algorithm_code');

-- -----------------------------------------------------------------------------
-- 6. C-03: release_package & release_package_item (0020 & 0023)
--    ZERO DISABLE TRIGGER! Full historical lifecycle & all 4 item triggers
--    (INSERT + UPDATE + DELETE + TRUNCATE).
-- -----------------------------------------------------------------------------
ALTER TABLE legal_builder.release_package
  ADD COLUMN manifest_checksum_algorithm_code text DEFAULT 'UNCLASSIFIED_PRE_0032';

UPDATE legal_builder.release_package
SET manifest_checksum_algorithm_code = NULL
WHERE status_code = 'DRAFT';

ALTER TABLE legal_builder.release_package
  ALTER COLUMN manifest_checksum_algorithm_code DROP DEFAULT;

ALTER TABLE legal_builder.release_package
  DROP CONSTRAINT ck_release_package_sealed_fields,
  ADD CONSTRAINT ck_release_package_sealed_fields CHECK (
    (
      status_code = 'DRAFT'
      AND manifest IS NULL
      AND manifest_checksum_sha256 IS NULL
      AND manifest_checksum_algorithm_code IS NULL
      AND sealed_at IS NULL
    )
    OR (
      status_code IN ('SEALED', 'SUPERSEDED')
      AND manifest IS NOT NULL
      AND manifest_checksum_sha256 ~ '^[0-9A-Fa-f]{64}$'
      AND manifest_checksum_algorithm_code IN (
        'UNCLASSIFIED_PRE_0032',
        'CANONICAL_JSON_V1_SHA256',
        'RFC8785_JCS'
      )
      AND sealed_at IS NOT NULL
      AND btrim(COALESCE(authority_basis, '')) <> ''
    )
  );

CREATE OR REPLACE FUNCTION legal_builder.guard_sealed_release_package()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status_code IN ('SEALED', 'SUPERSEDED') THEN
      RAISE EXCEPTION 'sealed release package is immutable'
        USING ERRCODE = '55000';
    END IF;
    RAISE EXCEPTION 'release_package does not allow DELETE (row %)', OLD.id
      USING ERRCODE = '55000';
  END IF;

  IF OLD.status_code = 'SUPERSEDED' THEN
    RAISE EXCEPTION 'sealed release package is immutable'
      USING ERRCODE = '55000';
  END IF;

  IF OLD.status_code = 'SEALED' THEN
    IF NEW.status_code = 'SUPERSEDED'
       AND NEW.revision = OLD.revision + 1
       AND NEW.id IS NOT DISTINCT FROM OLD.id
       AND NEW.project_id IS NOT DISTINCT FROM OLD.project_id
       AND NEW.code IS NOT DISTINCT FROM OLD.code
       AND NEW.name IS NOT DISTINCT FROM OLD.name
       AND NEW.purpose IS NOT DISTINCT FROM OLD.purpose
       AND NEW.authority_basis IS NOT DISTINCT FROM OLD.authority_basis
       AND NEW.manifest IS NOT DISTINCT FROM OLD.manifest
       AND NEW.manifest_checksum_sha256 IS NOT DISTINCT FROM OLD.manifest_checksum_sha256
       AND NEW.manifest_checksum_algorithm_code IS NOT DISTINCT FROM OLD.manifest_checksum_algorithm_code
       AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
       AND NEW.created_by_user_id IS NOT DISTINCT FROM OLD.created_by_user_id
       AND NEW.created_by_membership_id IS NOT DISTINCT FROM OLD.created_by_membership_id
       AND NEW.sealed_at IS NOT DISTINCT FROM OLD.sealed_at
       AND NEW.sealed_by_user_id IS NOT DISTINCT FROM OLD.sealed_by_user_id
       AND NEW.sealed_by_membership_id IS NOT DISTINCT FROM OLD.sealed_by_membership_id THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'sealed release package is immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.code IS DISTINCT FROM OLD.code
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
     OR NEW.created_by_membership_id IS DISTINCT FROM OLD.created_by_membership_id THEN
    RAISE EXCEPTION 'immutable identity fields on DRAFT release_package % cannot be modified', OLD.id
      USING ERRCODE = '55000';
  END IF;

  IF NEW.status_code = 'SUPERSEDED' THEN
    RAISE EXCEPTION 'release_package % cannot transition directly from DRAFT to SUPERSEDED', OLD.id
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status_code = 'SEALED' AND NEW.revision <> OLD.revision + 1 THEN
    RAISE EXCEPTION 'sealing release_package % must increment revision by 1 (% -> %)', OLD.id, OLD.revision, NEW.revision
      USING ERRCODE = '55000';
  END IF;

  IF NEW.revision < OLD.revision THEN
    RAISE EXCEPTION 'release_package % revision cannot decrease (% -> %)', OLD.id, OLD.revision, NEW.revision
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION legal_builder.enforce_release_package_jcs_on_seal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status_code = 'SUPERSEDED' THEN
      RAISE EXCEPTION 'cannot INSERT release_package % directly in SUPERSEDED status', NEW.id
        USING ERRCODE = '23514';
    END IF;
    IF NEW.status_code = 'DRAFT' AND NEW.manifest_checksum_algorithm_code IS NOT NULL THEN
      RAISE EXCEPTION 'DRAFT release_package % must have NULL manifest_checksum_algorithm_code', NEW.id
        USING ERRCODE = '23514';
    END IF;
    IF NEW.status_code = 'SEALED' AND NEW.manifest_checksum_algorithm_code IS DISTINCT FROM 'RFC8785_JCS' THEN
      RAISE EXCEPTION
        'Inserting SEALED release_package % must use manifest_checksum_algorithm_code = RFC8785_JCS (received: %)',
        NEW.id, COALESCE(NEW.manifest_checksum_algorithm_code, '<NULL>')
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status_code = 'DRAFT' AND NEW.status_code = 'DRAFT' THEN
    IF NEW.manifest_checksum_algorithm_code IS NOT NULL THEN
      RAISE EXCEPTION 'DRAFT release_package % must have NULL manifest_checksum_algorithm_code', NEW.id
        USING ERRCODE = '23514';
    END IF;
  ELSIF OLD.status_code = 'DRAFT' AND NEW.status_code = 'SEALED' THEN
    IF NEW.manifest_checksum_algorithm_code IS DISTINCT FROM 'RFC8785_JCS' THEN
      RAISE EXCEPTION
        'Sealing release_package % must use manifest_checksum_algorithm_code = RFC8785_JCS (received: %)',
        NEW.id, COALESCE(NEW.manifest_checksum_algorithm_code, '<NULL>')
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER tr_release_package_seal_marker_guard
  BEFORE INSERT OR UPDATE ON legal_builder.release_package
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.enforce_release_package_jcs_on_seal();

CREATE TRIGGER tr_release_package_no_truncate
  BEFORE TRUNCATE ON legal_builder.release_package
  FOR EACH STATEMENT
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE OR REPLACE FUNCTION legal_builder.guard_sealed_release_package_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  v_pkg_id uuid;
  v_status text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.package_id IS DISTINCT FROM OLD.package_id THEN
    RAISE EXCEPTION 'release_package_item package_id is immutable (cannot move item between packages)'
      USING ERRCODE = '55000';
  END IF;

  v_pkg_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.package_id ELSE NEW.package_id END;

  SELECT status_code INTO v_status
  FROM legal_builder.release_package
  WHERE id = v_pkg_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'parent release_package % does not exist', v_pkg_id
      USING ERRCODE = '23503';
  END IF;

  IF v_status IN ('SEALED', 'SUPERSEDED') THEN
    RAISE EXCEPTION 'sealed release package item is immutable'
      USING ERRCODE = '55000';
  END IF;

  RETURN COALESCE(NEW, OLD);
END $$;

-- Existing trigger tr_release_package_item_sealed_guard (from 0020) covers BEFORE UPDATE OR DELETE.
-- Adding BEFORE INSERT and BEFORE TRUNCATE completes full 4-event coverage (INSERT/UPDATE/DELETE/TRUNCATE).
CREATE TRIGGER tr_release_package_item_insert_guard
  BEFORE INSERT ON legal_builder.release_package_item
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.guard_sealed_release_package_item();

CREATE TRIGGER tr_release_package_item_no_truncate
  BEFORE TRUNCATE ON legal_builder.release_package_item
  FOR EACH STATEMENT
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

-- -----------------------------------------------------------------------------
-- 7. Audit Table Hardening (BEFORE TRUNCATE + Role-Scoped Event Guard)
-- -----------------------------------------------------------------------------
CREATE TRIGGER tr_audit_event_no_truncate
  BEFORE TRUNCATE ON legal_builder.audit_event
  FOR EACH STATEMENT
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER tr_system_audit_event_no_truncate
  BEFORE TRUNCATE ON legal_builder.system_audit_event
  FOR EACH STATEMENT
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE OR REPLACE FUNCTION legal_builder.guard_system_audit_event_role_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF current_user = 'ulh_reconciler'
     AND NEW.event_type_code <> 'CHECKSUM_RECONCILIATION_RUN' THEN
    RAISE EXCEPTION 'ulh_reconciler may only insert CHECKSUM_RECONCILIATION_RUN system_audit_event (got %)',
      NEW.event_type_code
      USING ERRCODE = '42501';
  END IF;

  IF current_user = 'ulh_governance_approver'
     AND NEW.event_type_code NOT IN (
       'CHECKSUM_INDEPENDENT_VERIFICATION_RECORDED',
       'CHECKSUM_RECONCILIATION_ATTEST_HISTORICAL_PROVENANCE',
       'CHECKSUM_RECONCILIATION_CONFIRM_AMBIGUOUS_ACCEPTED',
       'CHECKSUM_RECONCILIATION_CONFIRM_UNREPRODUCIBLE_ACCEPTED',
       'CHECKSUM_RECONCILIATION_ESCALATE_INTEGRITY_INCIDENT',
       'CHECKSUM_RECONCILIATION_REJECT_ATTESTATION'
     ) THEN
    RAISE EXCEPTION 'ulh_governance_approver may only insert CHECKSUM_* verification/approval audit events (got %)',
      NEW.event_type_code
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER tr_system_audit_event_role_scope_guard
  BEFORE INSERT ON legal_builder.system_audit_event
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.guard_system_audit_event_role_scope();

-- -----------------------------------------------------------------------------
-- 8. RBAC Permission Seed (0027), Transaction Actor Helper & RBAC Lock Helper
-- -----------------------------------------------------------------------------
INSERT INTO legal_builder.system_permission_definition (code, name, description)
VALUES (
  'CHECKSUM_RECONCILIATION_APPROVE',
  'Phê duyệt đối soát checksum',
  'Xác nhận nguồn gốc thuật toán lịch sử, chấp nhận ngoại lệ hoặc nâng cấp sự cố đối soát checksum'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO legal_builder.system_role_permission (role_code, permission_code)
VALUES ('SYSTEM_ADMIN', 'CHECKSUM_RECONCILIATION_APPROVE')
ON CONFLICT (role_code, permission_code) DO NOTHING;

CREATE OR REPLACE FUNCTION legal_builder.set_tx_actor_context(
  p_user_id uuid,
  p_auth_method text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  v_existing text;
  v_status text;
BEGIN
  IF p_user_id IS NULL OR p_auth_method NOT IN ('LOCAL_HMAC_SESSION', 'RECONCILER_SERVICE_PRINCIPAL') THEN
    RAISE EXCEPTION 'invalid transaction actor context parameters'
      USING ERRCODE = '22023';
  END IF;

  IF current_user = 'ulh_governance_approver' AND p_auth_method <> 'LOCAL_HMAC_SESSION' THEN
    RAISE EXCEPTION 'ulh_governance_approver requires LOCAL_HMAC_SESSION'
      USING ERRCODE = '42501';
  END IF;

  v_existing := NULLIF(pg_catalog.btrim(COALESCE(pg_catalog.current_setting('ulh.tx_actor_user_id', true), '')), '');
  IF v_existing IS NOT NULL AND v_existing <> p_user_id::text THEN
    RAISE EXCEPTION 'cannot change ulh.tx_actor_user_id within an active transaction (% -> %)', v_existing, p_user_id
      USING ERRCODE = '42501';
  END IF;

  SELECT status_code INTO v_status
  FROM legal_builder.user_account
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'transaction actor user_account % does not exist', p_user_id
      USING ERRCODE = '23503';
  END IF;

  IF v_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'transaction actor user_account % is not ACTIVE (%)', p_user_id, v_status
      USING ERRCODE = '55000';
  END IF;

  PERFORM pg_catalog.set_config('ulh.tx_actor_user_id', p_user_id::text, true);
  PERFORM pg_catalog.set_config('ulh.tx_auth_method', p_auth_method, true);
END $$;

-- Minimal SECURITY DEFINER helper (owned by ulh_migrator) to lock RBAC rows FOR SHARE
-- without granting UPDATE privilege on user_account / RBAC tables to ulh_governance_approver.
-- Lock order (strict alphabetical): system_role_definition -> user_account -> user_system_role_assignment
CREATE OR REPLACE FUNCTION legal_builder.verify_and_lock_approver_rbac(
  p_user_id uuid,
  p_role_code text
)
RETURNS TABLE(
  out_person_id uuid,
  out_provider_code text,
  out_external_subject text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_role_status text;
  v_user record;
  v_assignment_id uuid;
  v_has_perm boolean;
BEGIN
  SELECT status_code INTO v_role_status
  FROM legal_builder.system_role_definition
  WHERE code = p_role_code
  FOR SHARE;

  IF NOT FOUND OR v_role_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'system role % does not exist or is not ACTIVE', COALESCE(p_role_code, '<NULL>')
      USING ERRCODE = '42501';
  END IF;

  SELECT id, person_id, external_provider_code, external_subject, status_code
  INTO v_user
  FROM legal_builder.user_account
  WHERE id = p_user_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'approver user_account % does not exist', p_user_id
      USING ERRCODE = '23503';
  END IF;

  IF v_user.status_code <> 'ACTIVE' THEN
    RAISE EXCEPTION 'approver user_account % is not ACTIVE (%)', p_user_id, v_user.status_code
      USING ERRCODE = '55000';
  END IF;

  IF v_user.external_provider_code = 'service' OR v_user.person_id IS NULL THEN
    RAISE EXCEPTION 'technical service principal % cannot perform human governance approval', p_user_id
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_assignment_id
  FROM legal_builder.user_system_role_assignment
  WHERE user_id = p_user_id
    AND role_code = p_role_code
    AND revoked_at IS NULL
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user % lacks active assignment for role %', p_user_id, p_role_code
      USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM legal_builder.system_role_permission
    WHERE role_code = p_role_code
      AND permission_code = 'CHECKSUM_RECONCILIATION_APPROVE'
  ) INTO v_has_perm;

  IF NOT v_has_perm THEN
    RAISE EXCEPTION 'role % lacks CHECKSUM_RECONCILIATION_APPROVE permission', p_role_code
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY SELECT v_user.person_id, v_user.external_provider_code, v_user.external_subject;
END $$;

-- -----------------------------------------------------------------------------
-- 9. B-01, B-02, B-03, B-05, B-06: Tier-1 Reconciliation Evidence Table
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION legal_builder.is_valid_algorithm_set(p_arr text[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  v_seen text[] := ARRAY[]::text[];
  v_item text;
BEGIN
  IF p_arr IS NULL THEN
    RETURN false;
  END IF;
  IF pg_catalog.array_ndims(p_arr) > 1 THEN
    RETURN false;
  END IF;
  FOREACH v_item IN ARRAY p_arr LOOP
    IF v_item IS NULL
       OR v_item NOT IN (
         'LEGACY_JSON_STRINGIFY_SHA256',
         'CANONICAL_JSON_V1_SHA256',
         'RFC8785_JCS'
       ) THEN
      RETURN false;
    END IF;
    IF v_item = ANY(v_seen) THEN
      RETURN false;
    END IF;
    v_seen := pg_catalog.array_append(v_seen, v_item);
  END LOOP;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION legal_builder.is_valid_non_empty_algorithm_set(p_arr text[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN p_arr IS NOT NULL
     AND pg_catalog.cardinality(p_arr) >= 1
     AND legal_builder.is_valid_algorithm_set(p_arr);
END $$;

CREATE TABLE legal_builder.checksum_reconciliation_evidence (
  id uuid PRIMARY KEY,
  run_id text NOT NULL,
  correlation_id text NOT NULL,
  run_audit_event_id uuid NOT NULL REFERENCES legal_builder.system_audit_event(id),
  target_table text NOT NULL,
  target_row_id uuid NOT NULL,
  checksum_column text NOT NULL,
  draft_checkpoint_id uuid REFERENCES legal_builder.draft_checkpoint(id),
  draft_version_id uuid REFERENCES legal_builder.draft_version(id),
  release_package_id uuid REFERENCES legal_builder.release_package(id),
  amendment_source_version_id uuid REFERENCES legal_builder.amendment_source_version(id),
  draft_merge_operation_id uuid REFERENCES legal_builder.draft_merge_operation(id),
  draft_merge_conflict_id uuid REFERENCES legal_builder.draft_merge_conflict(id),
  publishing_job_id uuid REFERENCES legal_builder.publishing_job(id),
  persisted_checksum_sha256 char(64) NOT NULL,
  persisted_algorithm_code text NOT NULL,
  target_status_at_reconciliation text,
  tested_algorithms text[] NOT NULL,
  matched_algorithms text[] NOT NULL,
  provenance_basis_code text NOT NULL,
  marker_origin_code text NOT NULL,
  verified_migration_name text REFERENCES public.legal_builder_schema_migration(name),
  verified_trigger_name text,
  calculator_engine_id text NOT NULL,
  calculator_runtime_family text NOT NULL,
  calculator_version text NOT NULL,
  calculator_commit_sha char(40) NOT NULL,
  input_payload_locator text NOT NULL,
  input_payload_sha256 char(64),
  recomputed_hashes jsonb NOT NULL DEFAULT '{}'::jsonb,
  discriminator_feature_code text,
  discriminator_json_path text,
  artifact_type_code text,
  artifact_uri text,
  artifact_sha256 char(64),
  artifact_issuer text,
  classification_outcome text NOT NULL,
  diagnostic_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  reconciled_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  initiation_mode_code text NOT NULL,
  reconciled_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  triggered_by_user_id uuid REFERENCES legal_builder.user_account(id),
  automation_source_ref text,
  reconciled_by_db_role text NOT NULL DEFAULT current_user,

  CONSTRAINT uq_reconciliation_run_target_col
    UNIQUE (run_id, target_table, target_row_id, checksum_column),

  CONSTRAINT ck_reconciliation_checksum
    CHECK (persisted_checksum_sha256 ~ '^[0-9A-Fa-f]{64}$'),

  CONSTRAINT ck_reconciliation_persisted_algorithm CHECK (
    persisted_algorithm_code IN (
      'UNCLASSIFIED_PRE_0032',
      'LEGACY_JSON_STRINGIFY_SHA256',
      'CANONICAL_JSON_V1_SHA256',
      'RFC8785_JCS'
    )
  ),

  CONSTRAINT ck_reconciliation_initiation_mode CHECK (
    (initiation_mode_code = 'HUMAN_TRIGGERED'
      AND triggered_by_user_id IS NOT NULL
      AND automation_source_ref IS NULL)
    OR (initiation_mode_code = 'SCHEDULED_AUTOMATED'
      AND triggered_by_user_id IS NULL
      AND btrim(COALESCE(automation_source_ref, '')) <> '')
  ),

  CONSTRAINT ck_reconciliation_target_exclusive_arc CHECK (
    num_nonnulls(
      draft_checkpoint_id,
      draft_version_id,
      release_package_id,
      amendment_source_version_id,
      draft_merge_operation_id,
      draft_merge_conflict_id,
      publishing_job_id
    ) = 1
    AND (
      (target_table = 'legal_builder.draft_checkpoint'
        AND checksum_column = 'snapshot_checksum_sha256'
        AND draft_checkpoint_id = target_row_id
        AND persisted_algorithm_code <> 'UNCLASSIFIED_PRE_0032')
      OR (target_table = 'legal_builder.draft_version'
        AND checksum_column = 'snapshot_checksum_sha256'
        AND draft_version_id = target_row_id
        AND persisted_algorithm_code <> 'UNCLASSIFIED_PRE_0032')
      OR (target_table = 'legal_builder.release_package'
        AND checksum_column = 'manifest_checksum_sha256'
        AND release_package_id = target_row_id)
      OR (target_table = 'legal_builder.amendment_source_version'
        AND checksum_column = 'checksum_sha256'
        AND amendment_source_version_id = target_row_id)
      OR (target_table = 'legal_builder.draft_merge_operation'
        AND checksum_column IN ('input_checksum_sha256', 'preview_checksum_sha256')
        AND draft_merge_operation_id = target_row_id)
      OR (target_table = 'legal_builder.draft_merge_conflict'
        AND checksum_column = 'evidence_checksum_sha256'
        AND draft_merge_conflict_id = target_row_id)
      OR (target_table = 'legal_builder.publishing_job'
        AND checksum_column = 'input_fingerprint_sha256'
        AND publishing_job_id = target_row_id)
    )
  ),

  CONSTRAINT ck_reconciliation_tested_valid CHECK (
    legal_builder.is_valid_non_empty_algorithm_set(tested_algorithms)
  ),

  CONSTRAINT ck_reconciliation_matched_valid CHECK (
    legal_builder.is_valid_algorithm_set(matched_algorithms)
    AND matched_algorithms <@ tested_algorithms
  ),

  CONSTRAINT ck_reconciliation_tested_includes_persisted CHECK (
    persisted_algorithm_code = 'UNCLASSIFIED_PRE_0032'
    OR persisted_algorithm_code = ANY(tested_algorithms)
  ),

  CONSTRAINT ck_reconciliation_calculator_meta CHECK (
    btrim(calculator_engine_id) <> ''
    AND calculator_runtime_family IN (
      'NODE_JS', 'PYTHON', 'GO', 'RUST', 'JAVA', 'DOTNET', 'POSTGRES_NATIVE'
    )
    AND btrim(calculator_version) <> ''
    AND calculator_commit_sha ~ '^[0-9A-Fa-f]{40}$'
    AND btrim(input_payload_locator) <> ''
    AND (input_payload_sha256 IS NULL OR input_payload_sha256 ~ '^[0-9A-Fa-f]{64}$')
    AND jsonb_typeof(recomputed_hashes) = 'object'
  ),

  CONSTRAINT ck_reconciliation_marker_origin CHECK (
    marker_origin_code IN (
      'UNCLASSIFIED_PRE_0032',
      'BACKFILLED_DEFAULT_0014',
      'EXPLICIT_WRITE_POST_0014',
      'POST_0032_ENFORCED_JCS'
    )
  ),

  -- B-02: Strict scope of PAYLOAD_DISCRIMINATOR_FEATURE (no self-declared proof,
  -- requires >=2 tested algorithms, exact 1 match consistent with persisted marker,
  -- and strict JSONPath/JSON-Pointer syntax).
  CONSTRAINT ck_reconciliation_provenance_basis CHECK (
    (provenance_basis_code = 'NONE'
      AND verified_migration_name IS NULL
      AND verified_trigger_name IS NULL
      AND discriminator_feature_code IS NULL
      AND discriminator_json_path IS NULL
      AND artifact_type_code IS NULL
      AND artifact_uri IS NULL
      AND artifact_sha256 IS NULL
      AND artifact_issuer IS NULL)
    OR (provenance_basis_code = 'DB_PERSISTED_MARKER_0014'
      AND target_table IN ('legal_builder.draft_checkpoint', 'legal_builder.draft_version')
      AND persisted_algorithm_code IN ('LEGACY_JSON_STRINGIFY_SHA256', 'CANONICAL_JSON_V1_SHA256')
      AND marker_origin_code IN ('BACKFILLED_DEFAULT_0014', 'EXPLICIT_WRITE_POST_0014')
      AND verified_migration_name = '0014_snapshot_checksum_algorithm.sql'
      AND verified_trigger_name IS NULL
      AND discriminator_feature_code IS NULL
      AND discriminator_json_path IS NULL
      AND artifact_type_code IS NULL
      AND artifact_uri IS NULL
      AND artifact_sha256 IS NULL
      AND artifact_issuer IS NULL)
    OR (provenance_basis_code = 'POST_0032_ENFORCED_JCS_MARKER'
      AND persisted_algorithm_code = 'RFC8785_JCS'
      AND marker_origin_code = 'POST_0032_ENFORCED_JCS'
      AND verified_migration_name = '0032_checksum_algorithm_markers_and_jcs.sql'
      AND btrim(COALESCE(verified_trigger_name, '')) <> ''
      AND discriminator_feature_code IS NULL
      AND discriminator_json_path IS NULL
      AND artifact_type_code IS NULL
      AND artifact_uri IS NULL
      AND artifact_sha256 IS NULL
      AND artifact_issuer IS NULL)
    OR (provenance_basis_code = 'PAYLOAD_DISCRIMINATOR_FEATURE'
      AND persisted_algorithm_code <> 'RFC8785_JCS'
      AND cardinality(tested_algorithms) >= 2
      AND cardinality(matched_algorithms) = 1
      AND (persisted_algorithm_code = 'UNCLASSIFIED_PRE_0032'
           OR persisted_algorithm_code = matched_algorithms[1])
      AND input_payload_sha256 ~ '^[0-9A-Fa-f]{64}$'
      AND discriminator_feature_code IN (
        'NUMERIC_KEY_ORDERING',
        'NUMBER_SERIALIZATION_ECMA262',
        'UNICODE_CODE_UNIT_SORT',
        'KEY_INSERTION_ORDER'
      )
      AND btrim(COALESCE(discriminator_json_path, '')) ~ '^(\$|\/)'
      AND verified_migration_name IS NULL
      AND verified_trigger_name IS NULL
      AND artifact_type_code IS NULL
      AND artifact_uri IS NULL
      AND artifact_sha256 IS NULL
      AND artifact_issuer IS NULL)
    OR (provenance_basis_code = 'INDEPENDENT_ARTIFACT_ATTESTATION'
      AND persisted_algorithm_code <> 'RFC8785_JCS'
      AND artifact_type_code IN (
        'AUDIT_REPORT_SIGNED',
        'GIT_RELEASE_TAG_LOG',
        'MIGRATION_RUN_TRANSCRIPT',
        'BACKUP_MANIFEST_PROOF',
        'OWNER_DECISION_RECORD'
      )
      AND btrim(COALESCE(artifact_uri, '')) <> ''
      AND artifact_sha256 ~ '^[0-9A-Fa-f]{64}$'
      AND btrim(COALESCE(artifact_issuer, '')) <> ''
      AND verified_migration_name IS NULL
      AND verified_trigger_name IS NULL
      AND discriminator_feature_code IS NULL
      AND discriminator_json_path IS NULL)
  ),

  CONSTRAINT ck_reconciliation_outcome CHECK (
    classification_outcome IN (
      'PROVEN_HISTORICAL_ALGORITHM',
      'HASH_MATCH_ONLY_UNPROVEN_PROVENANCE',
      'MULTI_ALGORITHM_HASH_COLLISION_EQUIVALENT',
      'UNREPRODUCIBLE_HISTORICAL',
      'MISMATCH_INVESTIGATION_REQUIRED',
      'VERIFIED_POST_CUTOVER_JCS'
    )
  ),

  -- B-02 & B-06: Tight outcome consistency including controlled JSONB string taxonomy
  -- for UNREPRODUCIBLE_HISTORICAL (blocks '{}' object bypass via ->>).
  CONSTRAINT ck_reconciliation_outcome_consistency CHECK (
    (classification_outcome = 'PROVEN_HISTORICAL_ALGORITHM'
      AND provenance_basis_code = 'DB_PERSISTED_MARKER_0014'
      AND marker_origin_code = 'EXPLICIT_WRITE_POST_0014'
      AND persisted_algorithm_code = 'CANONICAL_JSON_V1_SHA256'
      AND matched_algorithms = ARRAY['CANONICAL_JSON_V1_SHA256']::text[])
    OR (classification_outcome = 'HASH_MATCH_ONLY_UNPROVEN_PROVENANCE'
      AND persisted_algorithm_code <> 'RFC8785_JCS'
      AND cardinality(matched_algorithms) = 1
      AND (persisted_algorithm_code = 'UNCLASSIFIED_PRE_0032'
           OR persisted_algorithm_code = matched_algorithms[1])
      AND provenance_basis_code IN ('NONE', 'DB_PERSISTED_MARKER_0014', 'PAYLOAD_DISCRIMINATOR_FEATURE', 'INDEPENDENT_ARTIFACT_ATTESTATION')
      AND (provenance_basis_code <> 'DB_PERSISTED_MARKER_0014' OR marker_origin_code = 'BACKFILLED_DEFAULT_0014'))
    OR (classification_outcome = 'MULTI_ALGORITHM_HASH_COLLISION_EQUIVALENT'
      AND persisted_algorithm_code <> 'RFC8785_JCS'
      AND cardinality(matched_algorithms) >= 2
      AND (persisted_algorithm_code = 'UNCLASSIFIED_PRE_0032'
           OR persisted_algorithm_code = ANY(matched_algorithms))
      AND provenance_basis_code IN ('NONE', 'DB_PERSISTED_MARKER_0014', 'INDEPENDENT_ARTIFACT_ATTESTATION'))
    OR (classification_outcome = 'UNREPRODUCIBLE_HISTORICAL'
      AND persisted_algorithm_code <> 'RFC8785_JCS'
      AND cardinality(matched_algorithms) = 0
      AND recomputed_hashes = '{}'::jsonb
      AND provenance_basis_code IN ('NONE', 'DB_PERSISTED_MARKER_0014', 'INDEPENDENT_ARTIFACT_ATTESTATION')
      AND jsonb_typeof(diagnostic_notes->'unreproducibleReasonCode') = 'string'
      AND (diagnostic_notes->>'unreproducibleReasonCode') IN (
        'SNAPSHOT_PAYLOAD_PURGED',
        'LEGACY_SERIALIZER_NON_DETERMINISTIC',
        'CORRUPT_HISTORICAL_PAYLOAD',
        'EXTERNAL_ASSET_UNAVAILABLE'
      )
      AND jsonb_typeof(diagnostic_notes->'unreproducibleDetail') = 'string'
      AND btrim(diagnostic_notes->>'unreproducibleDetail') <> '')
    OR (classification_outcome = 'MISMATCH_INVESTIGATION_REQUIRED'
      AND provenance_basis_code IN ('NONE', 'DB_PERSISTED_MARKER_0014', 'POST_0032_ENFORCED_JCS_MARKER', 'INDEPENDENT_ARTIFACT_ATTESTATION')
      AND (
        cardinality(matched_algorithms) = 0
        OR (
          persisted_algorithm_code <> 'UNCLASSIFIED_PRE_0032'
          AND NOT (persisted_algorithm_code = ANY(matched_algorithms))
        )
      ))
    OR (classification_outcome = 'VERIFIED_POST_CUTOVER_JCS'
      AND provenance_basis_code = 'POST_0032_ENFORCED_JCS_MARKER'
      AND marker_origin_code = 'POST_0032_ENFORCED_JCS'
      AND persisted_algorithm_code = 'RFC8785_JCS'
      AND matched_algorithms = ARRAY['RFC8785_JCS']::text[])
  ),

  CONSTRAINT ck_reconciliation_notes_object CHECK (jsonb_typeof(diagnostic_notes) = 'object'),
  CONSTRAINT ck_reconciliation_run_actor CHECK (
    btrim(run_id) <> '' AND btrim(correlation_id) <> '' AND btrim(reconciled_by_db_role) <> ''
  )
);

CREATE INDEX ix_checksum_reconciliation_target
  ON legal_builder.checksum_reconciliation_evidence (target_table, target_row_id, reconciled_at DESC);
CREATE INDEX ix_reconciliation_fk_checkpoint
  ON legal_builder.checksum_reconciliation_evidence (draft_checkpoint_id) WHERE draft_checkpoint_id IS NOT NULL;
CREATE INDEX ix_reconciliation_fk_version
  ON legal_builder.checksum_reconciliation_evidence (draft_version_id) WHERE draft_version_id IS NOT NULL;
CREATE INDEX ix_reconciliation_fk_release_package
  ON legal_builder.checksum_reconciliation_evidence (release_package_id) WHERE release_package_id IS NOT NULL;
CREATE INDEX ix_reconciliation_fk_amendment_source
  ON legal_builder.checksum_reconciliation_evidence (amendment_source_version_id) WHERE amendment_source_version_id IS NOT NULL;
CREATE INDEX ix_reconciliation_fk_merge_op
  ON legal_builder.checksum_reconciliation_evidence (draft_merge_operation_id) WHERE draft_merge_operation_id IS NOT NULL;
CREATE INDEX ix_reconciliation_fk_merge_conflict
  ON legal_builder.checksum_reconciliation_evidence (draft_merge_conflict_id) WHERE draft_merge_conflict_id IS NOT NULL;
CREATE INDEX ix_reconciliation_fk_publishing_job
  ON legal_builder.checksum_reconciliation_evidence (publishing_job_id) WHERE publishing_job_id IS NOT NULL;

-- B-03: Actor & Run Audit Event binding including metadata cross-check
CREATE OR REPLACE FUNCTION legal_builder.bind_reconciliation_evidence_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  v_tx_actor text;
  v_tx_auth text;
  v_reconciler record;
  v_trigger record;
  v_run_audit record;
BEGIN
  NEW.reconciled_by_db_role := current_user;

  v_tx_actor := NULLIF(pg_catalog.btrim(COALESCE(pg_catalog.current_setting('ulh.tx_actor_user_id', true), '')), '');
  v_tx_auth  := NULLIF(pg_catalog.btrim(COALESCE(pg_catalog.current_setting('ulh.tx_auth_method', true), '')), '');

  IF v_tx_actor IS NULL
     OR v_tx_actor !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     OR v_tx_actor::uuid IS DISTINCT FROM NEW.reconciled_by_user_id
     OR v_tx_auth NOT IN ('LOCAL_HMAC_SESSION', 'RECONCILER_SERVICE_PRINCIPAL') THEN
    RAISE EXCEPTION 'transaction-scoped principal mismatch or missing set_tx_actor_context()'
      USING ERRCODE = '42501';
  END IF;

  SELECT status_code, external_provider_code INTO v_reconciler
  FROM legal_builder.user_account
  WHERE id = NEW.reconciled_by_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reconciled_by_user_id % does not exist', NEW.reconciled_by_user_id
      USING ERRCODE = '23503';
  END IF;

  IF v_reconciler.status_code <> 'ACTIVE' THEN
    RAISE EXCEPTION 'reconciled_by_user_id % is not ACTIVE (%)', NEW.reconciled_by_user_id, v_reconciler.status_code
      USING ERRCODE = '55000';
  END IF;

  IF NEW.initiation_mode_code = 'SCHEDULED_AUTOMATED' AND v_reconciler.external_provider_code <> 'service' THEN
    RAISE EXCEPTION 'SCHEDULED_AUTOMATED reconciliation must run under a service principal'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.initiation_mode_code = 'HUMAN_TRIGGERED' THEN
    SELECT status_code, external_provider_code, person_id INTO v_trigger
    FROM legal_builder.user_account
    WHERE id = NEW.triggered_by_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'triggered_by_user_id % does not exist', NEW.triggered_by_user_id
        USING ERRCODE = '23503';
    END IF;
    IF v_trigger.status_code <> 'ACTIVE' OR v_trigger.external_provider_code = 'service' OR v_trigger.person_id IS NULL THEN
      RAISE EXCEPTION 'triggered_by_user_id % must be an ACTIVE human account', NEW.triggered_by_user_id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  SELECT event_type_code, aggregate_type_code, aggregate_id, actor_user_id, correlation_id, metadata, occurred_at
  INTO v_run_audit
  FROM legal_builder.system_audit_event
  WHERE id = NEW.run_audit_event_id;

  IF NOT FOUND
     OR v_run_audit.event_type_code <> 'CHECKSUM_RECONCILIATION_RUN'
     OR v_run_audit.aggregate_type_code <> 'CHECKSUM_RECONCILIATION_RUN'
     OR v_run_audit.aggregate_id <> NEW.run_id
     OR v_run_audit.actor_user_id IS DISTINCT FROM NEW.reconciled_by_user_id
     OR v_run_audit.correlation_id IS DISTINCT FROM NEW.correlation_id
     OR v_run_audit.occurred_at > NEW.reconciled_at THEN
    RAISE EXCEPTION 'run_audit_event_id % does not match CHECKSUM_RECONCILIATION_RUN % / correlation % / actor %',
      NEW.run_audit_event_id, NEW.run_id, NEW.correlation_id, NEW.reconciled_by_user_id
      USING ERRCODE = '23514';
  END IF;

  -- B-03: Validate initiation_mode_code, triggered_by_user_id, automation_source_ref against run audit metadata
  IF v_run_audit.metadata IS NULL
     OR pg_catalog.jsonb_typeof(v_run_audit.metadata) <> 'object'
     OR pg_catalog.jsonb_typeof(v_run_audit.metadata->'initiationMode') <> 'string'
     OR (v_run_audit.metadata->>'initiationMode') IS DISTINCT FROM NEW.initiation_mode_code THEN
    RAISE EXCEPTION 'run_audit_event_id % metadata.initiationMode does not match %',
      NEW.run_audit_event_id, NEW.initiation_mode_code
      USING ERRCODE = '23514';
  END IF;

  IF NEW.initiation_mode_code = 'HUMAN_TRIGGERED' THEN
    IF pg_catalog.jsonb_typeof(v_run_audit.metadata->'triggeredByUserId') <> 'string'
       OR (v_run_audit.metadata->>'triggeredByUserId') IS DISTINCT FROM NEW.triggered_by_user_id::text
       OR ((v_run_audit.metadata->'automationSourceRef') IS NOT NULL
           AND pg_catalog.jsonb_typeof(v_run_audit.metadata->'automationSourceRef') <> 'null') THEN
      RAISE EXCEPTION 'run_audit_event_id % metadata does not match HUMAN_TRIGGERED initiator %',
        NEW.run_audit_event_id, NEW.triggered_by_user_id
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.initiation_mode_code = 'SCHEDULED_AUTOMATED' THEN
    IF pg_catalog.jsonb_typeof(v_run_audit.metadata->'automationSourceRef') <> 'string'
       OR (v_run_audit.metadata->>'automationSourceRef') IS DISTINCT FROM NEW.automation_source_ref
       OR ((v_run_audit.metadata->'triggeredByUserId') IS NOT NULL
           AND pg_catalog.jsonb_typeof(v_run_audit.metadata->'triggeredByUserId') <> 'null') THEN
      RAISE EXCEPTION 'run_audit_event_id % metadata does not match SCHEDULED_AUTOMATED source %',
        NEW.run_audit_event_id, NEW.automation_source_ref
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END $$;

-- B-01 & B-02: Live-row snapshot verification + Universal 1-to-1 recomputed_hashes validation
CREATE OR REPLACE FUNCTION legal_builder.verify_reconciliation_evidence_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_live_checksum text;
  v_live_marker text;
  v_live_status text;
  v_live_ts timestamptz;
  v_m0014_applied_at timestamptz;
  v_expected_trigger text;
  v_active_trigger text;
  v_k text;
  v_v_json jsonb;
  v_v text;
  v_hash_count integer := 0;
  v_derived_matched text[] := ARRAY[]::text[];
  v_distinct_other integer := 0;
BEGIN
  IF NEW.target_table = 'legal_builder.draft_checkpoint' AND NEW.checksum_column = 'snapshot_checksum_sha256' THEN
    SELECT pg_catalog.btrim(snapshot_checksum_sha256), snapshot_checksum_algorithm_code, NULL::text, created_at
    INTO v_live_checksum, v_live_marker, v_live_status, v_live_ts
    FROM legal_builder.draft_checkpoint WHERE id = NEW.draft_checkpoint_id FOR SHARE;
  ELSIF NEW.target_table = 'legal_builder.draft_version' AND NEW.checksum_column = 'snapshot_checksum_sha256' THEN
    SELECT pg_catalog.btrim(snapshot_checksum_sha256), snapshot_checksum_algorithm_code, NULL::text, sealed_at
    INTO v_live_checksum, v_live_marker, v_live_status, v_live_ts
    FROM legal_builder.draft_version WHERE id = NEW.draft_version_id FOR SHARE;
  ELSIF NEW.target_table = 'legal_builder.release_package' AND NEW.checksum_column = 'manifest_checksum_sha256' THEN
    SELECT pg_catalog.btrim(manifest_checksum_sha256), manifest_checksum_algorithm_code, status_code, sealed_at
    INTO v_live_checksum, v_live_marker, v_live_status, v_live_ts
    FROM legal_builder.release_package WHERE id = NEW.release_package_id FOR SHARE;
  ELSIF NEW.target_table = 'legal_builder.amendment_source_version' AND NEW.checksum_column = 'checksum_sha256' THEN
    SELECT pg_catalog.btrim(checksum_sha256), checksum_algorithm_code, verification_status_code, recorded_at
    INTO v_live_checksum, v_live_marker, v_live_status, v_live_ts
    FROM legal_builder.amendment_source_version WHERE id = NEW.amendment_source_version_id FOR SHARE;
  ELSIF NEW.target_table = 'legal_builder.draft_merge_operation' AND NEW.checksum_column = 'input_checksum_sha256' THEN
    SELECT pg_catalog.btrim(input_checksum_sha256), input_checksum_algorithm_code, status_code, created_at
    INTO v_live_checksum, v_live_marker, v_live_status, v_live_ts
    FROM legal_builder.draft_merge_operation WHERE id = NEW.draft_merge_operation_id FOR SHARE;
  ELSIF NEW.target_table = 'legal_builder.draft_merge_operation' AND NEW.checksum_column = 'preview_checksum_sha256' THEN
    SELECT pg_catalog.btrim(preview_checksum_sha256), preview_checksum_algorithm_code, status_code, created_at
    INTO v_live_checksum, v_live_marker, v_live_status, v_live_ts
    FROM legal_builder.draft_merge_operation WHERE id = NEW.draft_merge_operation_id FOR SHARE;
  ELSIF NEW.target_table = 'legal_builder.draft_merge_conflict' AND NEW.checksum_column = 'evidence_checksum_sha256' THEN
    SELECT pg_catalog.btrim(evidence_checksum_sha256), evidence_checksum_algorithm_code, NULL::text, created_at
    INTO v_live_checksum, v_live_marker, v_live_status, v_live_ts
    FROM legal_builder.draft_merge_conflict WHERE id = NEW.draft_merge_conflict_id FOR SHARE;
  ELSIF NEW.target_table = 'legal_builder.publishing_job' AND NEW.checksum_column = 'input_fingerprint_sha256' THEN
    SELECT pg_catalog.btrim(input_fingerprint_sha256), input_fingerprint_algorithm_code, status_code, requested_at
    INTO v_live_checksum, v_live_marker, v_live_status, v_live_ts
    FROM legal_builder.publishing_job WHERE id = NEW.publishing_job_id FOR SHARE;
  ELSE
    RAISE EXCEPTION 'invalid reconciliation target pair (%.%)',
      COALESCE(NEW.target_table, '<NULL>'), COALESCE(NEW.checksum_column, '<NULL>')
      USING ERRCODE = '23514';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reconciliation target row %.% id % does not exist',
      NEW.target_table, NEW.checksum_column, NEW.target_row_id
      USING ERRCODE = '23503';
  END IF;

  IF NEW.target_table = 'legal_builder.release_package'
     AND v_live_status NOT IN ('SEALED', 'SUPERSEDED') THEN
    RAISE EXCEPTION 'cannot record reconciliation evidence for unsealed release_package % (%)',
      NEW.release_package_id, COALESCE(v_live_status, '<NULL>')
      USING ERRCODE = '23514';
  END IF;

  IF NEW.target_table = 'legal_builder.draft_merge_operation'
     AND NEW.checksum_column = 'preview_checksum_sha256'
     AND v_live_status NOT IN ('COMPLETED', 'ABANDONED') THEN
    RAISE EXCEPTION 'cannot record preview_checksum_sha256 reconciliation evidence while draft_merge_operation % is open (%)',
      NEW.draft_merge_operation_id, COALESCE(v_live_status, '<NULL>')
      USING ERRCODE = '23514';
  END IF;

  NEW.target_status_at_reconciliation := v_live_status;

  IF v_live_checksum IS DISTINCT FROM pg_catalog.btrim(NEW.persisted_checksum_sha256)
     OR v_live_marker IS DISTINCT FROM NEW.persisted_algorithm_code THEN
    RAISE EXCEPTION
      'reconciliation evidence snapshot mismatch for %.% row % (live: %/%, supplied: %/%)',
      NEW.target_table, NEW.checksum_column, NEW.target_row_id,
      COALESCE(v_live_checksum, '<NULL>'), COALESCE(v_live_marker, '<NULL>'),
      pg_catalog.btrim(NEW.persisted_checksum_sha256), NEW.persisted_algorithm_code
      USING ERRCODE = '23514';
  END IF;

  IF v_live_marker = 'UNCLASSIFIED_PRE_0032' THEN
    IF NEW.marker_origin_code <> 'UNCLASSIFIED_PRE_0032' THEN
      RAISE EXCEPTION 'marker_origin_code must be UNCLASSIFIED_PRE_0032 for unclassified row %', NEW.target_row_id
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_live_marker = 'RFC8785_JCS' THEN
    IF NEW.marker_origin_code <> 'POST_0032_ENFORCED_JCS' THEN
      RAISE EXCEPTION 'marker_origin_code must be POST_0032_ENFORCED_JCS for RFC8785_JCS row %', NEW.target_row_id
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_live_marker IN ('LEGACY_JSON_STRINGIFY_SHA256', 'CANONICAL_JSON_V1_SHA256') THEN
    SELECT applied_at INTO v_m0014_applied_at
    FROM public.legal_builder_schema_migration
    WHERE name = '0014_snapshot_checksum_algorithm.sql';

    IF NEW.provenance_basis_code = 'DB_PERSISTED_MARKER_0014' AND NOT FOUND THEN
      RAISE EXCEPTION '0014_snapshot_checksum_algorithm.sql is not recorded in public.legal_builder_schema_migration'
        USING ERRCODE = '55000';
    END IF;

    IF v_live_marker = 'LEGACY_JSON_STRINGIFY_SHA256'
       AND NEW.marker_origin_code <> 'BACKFILLED_DEFAULT_0014' THEN
      RAISE EXCEPTION 'LEGACY_JSON_STRINGIFY_SHA256 row % must use marker_origin_code = BACKFILLED_DEFAULT_0014', NEW.target_row_id
        USING ERRCODE = '23514';
    END IF;

    IF v_live_marker = 'CANONICAL_JSON_V1_SHA256'
       AND NEW.provenance_basis_code = 'DB_PERSISTED_MARKER_0014' THEN
      IF v_m0014_applied_at IS NULL OR v_live_ts < v_m0014_applied_at THEN
        RAISE EXCEPTION 'CANONICAL_JSON_V1_SHA256 row % timestamp % precedes 0014 applied_at %',
          NEW.target_row_id, COALESCE(v_live_ts::text, '<NULL>'), COALESCE(v_m0014_applied_at::text, '<NULL>')
          USING ERRCODE = '23514';
      END IF;
      IF NEW.marker_origin_code <> 'EXPLICIT_WRITE_POST_0014' THEN
        RAISE EXCEPTION 'post-0014 CANONICAL_JSON_V1_SHA256 row % must use marker_origin_code = EXPLICIT_WRITE_POST_0014', NEW.target_row_id
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  IF NEW.provenance_basis_code = 'POST_0032_ENFORCED_JCS_MARKER' THEN
    v_expected_trigger := CASE NEW.target_table
      WHEN 'legal_builder.draft_checkpoint' THEN 'tr_draft_checkpoint_jcs_insert_guard'
      WHEN 'legal_builder.draft_version' THEN 'tr_draft_version_jcs_insert_guard'
      WHEN 'legal_builder.release_package' THEN 'tr_release_package_seal_marker_guard'
      WHEN 'legal_builder.amendment_source_version' THEN 'tr_amendment_source_version_jcs_insert_guard'
      WHEN 'legal_builder.draft_merge_operation' THEN 'tr_merge_operation_jcs_insert_guard'
      WHEN 'legal_builder.draft_merge_conflict' THEN 'tr_merge_conflict_jcs_insert_guard'
      WHEN 'legal_builder.publishing_job' THEN 'tr_publishing_job_jcs_insert_guard'
    END;

    SELECT t.tgname INTO v_active_trigger
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'legal_builder'
      AND ('legal_builder.' || c.relname) = NEW.target_table
      AND t.tgname = v_expected_trigger
      AND NOT t.tgisinternal
      AND t.tgenabled = 'O';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'expected active JCS enforcement trigger % is missing or disabled on %',
        v_expected_trigger, NEW.target_table
        USING ERRCODE = '55000';
    END IF;

    IF NEW.verified_trigger_name IS DISTINCT FROM v_expected_trigger THEN
      RAISE EXCEPTION 'verified_trigger_name must be % for table % (received: %)',
        v_expected_trigger, NEW.target_table, COALESCE(NEW.verified_trigger_name, '<NULL>')
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- B-01: Universal 1-to-1 mathematical verification among tested_algorithms,
  -- recomputed_hashes, and matched_algorithms across ALL outcomes.
  IF NEW.classification_outcome = 'UNREPRODUCIBLE_HISTORICAL' THEN
    IF NEW.recomputed_hashes IS DISTINCT FROM '{}'::jsonb THEN
      RAISE EXCEPTION 'UNREPRODUCIBLE_HISTORICAL must have empty recomputed_hashes ({})'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    FOR v_k, v_v_json IN SELECT key, value FROM pg_catalog.jsonb_each(NEW.recomputed_hashes) LOOP
      IF NOT (v_k = ANY(NEW.tested_algorithms)) THEN
        RAISE EXCEPTION 'recomputed_hashes key % is not present in tested_algorithms', v_k
          USING ERRCODE = '23514';
      END IF;
      IF pg_catalog.jsonb_typeof(v_v_json) <> 'string' THEN
        RAISE EXCEPTION 'recomputed_hashes value for % must be a JSON string', v_k
          USING ERRCODE = '23514';
      END IF;
      v_v := NEW.recomputed_hashes->>v_k;
      IF v_v IS NULL OR v_v !~ '^[0-9A-Fa-f]{64}$' THEN
        RAISE EXCEPTION 'recomputed_hashes value for % is not a valid 64-hex SHA-256', v_k
          USING ERRCODE = '23514';
      END IF;
      v_hash_count := v_hash_count + 1;
      IF pg_catalog.lower(v_v) = pg_catalog.lower(pg_catalog.btrim(NEW.persisted_checksum_sha256)) THEN
        v_derived_matched := pg_catalog.array_append(v_derived_matched, v_k);
      ELSE
        v_distinct_other := v_distinct_other + 1;
      END IF;
    END LOOP;

    IF v_hash_count <> pg_catalog.cardinality(NEW.tested_algorithms) THEN
      RAISE EXCEPTION 'recomputed_hashes keys (%) must match tested_algorithms (%) 1-to-1',
        v_hash_count, pg_catalog.cardinality(NEW.tested_algorithms)
        USING ERRCODE = '23514';
    END IF;

    IF NOT (NEW.matched_algorithms <@ v_derived_matched
            AND v_derived_matched <@ NEW.matched_algorithms
            AND pg_catalog.cardinality(NEW.matched_algorithms) = pg_catalog.cardinality(v_derived_matched)) THEN
      RAISE EXCEPTION 'matched_algorithms (%) does not match hashes equal to persisted_checksum_sha256 (%)',
        NEW.matched_algorithms, v_derived_matched
        USING ERRCODE = '23514';
    END IF;

    IF NEW.provenance_basis_code = 'PAYLOAD_DISCRIMINATOR_FEATURE' AND v_distinct_other < 1 THEN
      RAISE EXCEPTION 'PAYLOAD_DISCRIMINATOR_FEATURE requires >= 1 divergent tested algorithm hash'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER tr_01_reconciliation_evidence_actor_bind
  BEFORE INSERT ON legal_builder.checksum_reconciliation_evidence
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.bind_reconciliation_evidence_actor();

CREATE TRIGGER tr_02_reconciliation_evidence_live_row_guard
  BEFORE INSERT ON legal_builder.checksum_reconciliation_evidence
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.verify_reconciliation_evidence_insert();

CREATE TRIGGER tr_checksum_reconciliation_evidence_immutable
  BEFORE UPDATE OR DELETE ON legal_builder.checksum_reconciliation_evidence
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER tr_checksum_reconciliation_evidence_no_truncate
  BEFORE TRUNCATE ON legal_builder.checksum_reconciliation_evidence
  FOR EACH STATEMENT
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

-- -----------------------------------------------------------------------------
-- 10. B-02, B-04, B-05, C-01: Tier-1.5 Append-Only Independent Verification Table
-- -----------------------------------------------------------------------------
CREATE TABLE legal_builder.checksum_independent_verification (
  id uuid PRIMARY KEY,
  evidence_id uuid NOT NULL REFERENCES legal_builder.checksum_reconciliation_evidence(id),
  verifier_engine_id text NOT NULL,
  verifier_runtime_family text NOT NULL,
  verifier_version text NOT NULL,
  verifier_commit_sha char(40) NOT NULL,
  verified_payload_sha256 char(64),
  tested_algorithms text[] NOT NULL,
  recomputed_hashes jsonb NOT NULL DEFAULT '{}'::jsonb,
  matched_algorithms text[] NOT NULL,
  verified_discriminator_feature_code text,
  verified_discriminator_json_path text,
  verification_outcome_code text NOT NULL,
  verification_report_uri text NOT NULL,
  verification_report_sha256 char(64) NOT NULL,
  verified_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  verified_by_db_role text NOT NULL DEFAULT current_user,
  system_audit_event_id uuid NOT NULL REFERENCES legal_builder.system_audit_event(id),
  verified_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  notes text,

  CONSTRAINT uq_independent_verification_audit UNIQUE (system_audit_event_id),
  CONSTRAINT ck_ind_verif_meta CHECK (
    btrim(verifier_engine_id) <> ''
    AND verifier_runtime_family IN (
      'NODE_JS', 'PYTHON', 'GO', 'RUST', 'JAVA', 'DOTNET', 'POSTGRES_NATIVE'
    )
    AND btrim(verifier_version) <> ''
    AND verifier_commit_sha ~ '^[0-9A-Fa-f]{40}$'
    AND btrim(verification_report_uri) <> ''
    AND verification_report_sha256 ~ '^[0-9A-Fa-f]{64}$'
    AND btrim(verified_by_db_role) <> ''
    AND jsonb_typeof(recomputed_hashes) = 'object'
    AND (
      (verified_discriminator_feature_code IS NULL AND verified_discriminator_json_path IS NULL)
      OR (
        verified_discriminator_feature_code IN (
          'NUMERIC_KEY_ORDERING',
          'NUMBER_SERIALIZATION_ECMA262',
          'UNICODE_CODE_UNIT_SORT',
          'KEY_INSERTION_ORDER'
        )
        AND btrim(COALESCE(verified_discriminator_json_path, '')) ~ '^(\$|\/)'
      )
    )
  ),
  CONSTRAINT ck_ind_verif_algorithms CHECK (
    legal_builder.is_valid_non_empty_algorithm_set(tested_algorithms)
    AND legal_builder.is_valid_algorithm_set(matched_algorithms)
    AND matched_algorithms <@ tested_algorithms
  ),
  CONSTRAINT ck_ind_verif_outcome CHECK (
    (verification_outcome_code = 'INDEPENDENTLY_REPRODUCED'
      AND verified_payload_sha256 ~ '^[0-9A-Fa-f]{64}$'
      AND cardinality(matched_algorithms) >= 1)
    OR (verification_outcome_code = 'DISAGREEMENT_WITH_SCANNER'
      AND verified_payload_sha256 ~ '^[0-9A-Fa-f]{64}$')
    OR (verification_outcome_code = 'PAYLOAD_DRIFT_DETECTED'
      AND verified_payload_sha256 ~ '^[0-9A-Fa-f]{64}$')
    OR (verification_outcome_code = 'LOCATOR_UNREACHABLE'
      AND verified_payload_sha256 IS NULL
      AND recomputed_hashes = '{}'::jsonb
      AND cardinality(matched_algorithms) = 0
      AND btrim(COALESCE(notes, '')) <> '')
  )
);

CREATE INDEX ix_independent_verification_evidence
  ON legal_builder.checksum_independent_verification (evidence_id, verified_at DESC);

CREATE OR REPLACE FUNCTION legal_builder.guard_independent_verification_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  v_tx_actor text;
  v_tx_auth text;
  v_ev record;
  v_verifier record;
  v_reconciler record;
  v_triggered record;
  v_audit record;
  v_k text;
  v_v_json jsonb;
  v_v text;
  v_hash_count integer := 0;
  v_derived_matched text[] := ARRAY[]::text[];
BEGIN
  NEW.verified_by_db_role := current_user;

  v_tx_actor := NULLIF(pg_catalog.btrim(COALESCE(pg_catalog.current_setting('ulh.tx_actor_user_id', true), '')), '');
  v_tx_auth  := NULLIF(pg_catalog.btrim(COALESCE(pg_catalog.current_setting('ulh.tx_auth_method', true), '')), '');

  IF v_tx_actor IS NULL
     OR v_tx_actor !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     OR v_tx_actor::uuid IS DISTINCT FROM NEW.verified_by_user_id
     OR v_tx_auth <> 'LOCAL_HMAC_SESSION' THEN
    RAISE EXCEPTION 'independent verification requires set_tx_actor_context() with LOCAL_HMAC_SESSION'
      USING ERRCODE = '42501';
  END IF;

  -- C-01: Shared evidence-level advisory lock synchronized with checksum_reconciliation_approval
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('checksum_evidence_governance:' || NEW.evidence_id::text, 0)
  );

  SELECT id, persisted_checksum_sha256, provenance_basis_code,
         calculator_engine_id, calculator_runtime_family,
         input_payload_sha256, tested_algorithms, matched_algorithms, recomputed_hashes,
         discriminator_feature_code, discriminator_json_path,
         reconciled_by_user_id, triggered_by_user_id
  INTO v_ev
  FROM legal_builder.checksum_reconciliation_evidence
  WHERE id = NEW.evidence_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reconciliation evidence % does not exist', NEW.evidence_id
      USING ERRCODE = '23503';
  END IF;

  -- B-05: Technical independence requires BOTH distinct engine ID AND distinct runtime family
  IF pg_catalog.lower(pg_catalog.btrim(NEW.verifier_engine_id)) =
     pg_catalog.lower(pg_catalog.btrim(v_ev.calculator_engine_id)) THEN
    RAISE EXCEPTION 'independent verifier_engine_id (%) must differ from scanner calculator_engine_id (%)',
      NEW.verifier_engine_id, v_ev.calculator_engine_id
      USING ERRCODE = '23514';
  END IF;

  IF NEW.verifier_runtime_family = v_ev.calculator_runtime_family THEN
    RAISE EXCEPTION 'independent verifier_runtime_family (%) must differ from scanner calculator_runtime_family (%)',
      NEW.verifier_runtime_family, v_ev.calculator_runtime_family
      USING ERRCODE = '23514';
  END IF;

  -- B-04: Enforce ACTIVE human verifier distinct from BOTH reconciler & initiator on ALL 3 identity dimensions
  SELECT id, person_id, external_provider_code, external_subject, status_code
  INTO v_verifier
  FROM legal_builder.user_account
  WHERE id = NEW.verified_by_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'verified_by_user_id % does not exist', NEW.verified_by_user_id
      USING ERRCODE = '23503';
  END IF;

  IF v_verifier.status_code <> 'ACTIVE' OR v_verifier.external_provider_code = 'service' OR v_verifier.person_id IS NULL THEN
    RAISE EXCEPTION 'independent verifier % must be an ACTIVE human account', NEW.verified_by_user_id
      USING ERRCODE = '42501';
  END IF;

  SELECT id, person_id, external_subject INTO v_reconciler
  FROM legal_builder.user_account WHERE id = v_ev.reconciled_by_user_id;

  IF v_verifier.id = v_reconciler.id
     OR (v_reconciler.person_id IS NOT NULL AND v_verifier.person_id = v_reconciler.person_id)
     OR pg_catalog.lower(pg_catalog.btrim(v_verifier.external_subject)) =
        pg_catalog.lower(pg_catalog.btrim(v_reconciler.external_subject)) THEN
    RAISE EXCEPTION 'independent verifier % cannot be the same actor/person/subject as scanner reconciler', NEW.verified_by_user_id
      USING ERRCODE = '55000';
  END IF;

  IF v_ev.triggered_by_user_id IS NOT NULL THEN
    SELECT id, person_id, external_subject INTO v_triggered
    FROM legal_builder.user_account WHERE id = v_ev.triggered_by_user_id;
    IF v_verifier.id = v_triggered.id
       OR (v_triggered.person_id IS NOT NULL AND v_verifier.person_id = v_triggered.person_id)
       OR pg_catalog.lower(pg_catalog.btrim(v_verifier.external_subject)) =
          pg_catalog.lower(pg_catalog.btrim(v_triggered.external_subject)) THEN
      RAISE EXCEPTION 'independent verifier % cannot be the same actor/person/subject as reconciliation initiator', NEW.verified_by_user_id
        USING ERRCODE = '55000';
    END IF;
  END IF;

  -- B-01/B-05: Universal 1-to-1 recomputed_hashes validation on Tier-1.5 verification
  IF NEW.verification_outcome_code IN ('INDEPENDENTLY_REPRODUCED', 'DISAGREEMENT_WITH_SCANNER') THEN
    FOR v_k, v_v_json IN SELECT key, value FROM pg_catalog.jsonb_each(NEW.recomputed_hashes) LOOP
      IF NOT (v_k = ANY(NEW.tested_algorithms)) THEN
        RAISE EXCEPTION 'verifier recomputed_hashes key % is not in tested_algorithms', v_k
          USING ERRCODE = '23514';
      END IF;
      IF pg_catalog.jsonb_typeof(v_v_json) <> 'string' THEN
        RAISE EXCEPTION 'verifier recomputed_hashes value for % must be a JSON string', v_k
          USING ERRCODE = '23514';
      END IF;
      v_v := NEW.recomputed_hashes->>v_k;
      IF v_v IS NULL OR v_v !~ '^[0-9A-Fa-f]{64}$' THEN
        RAISE EXCEPTION 'verifier recomputed_hashes value for % is not a valid 64-hex SHA-256', v_k
          USING ERRCODE = '23514';
      END IF;
      v_hash_count := v_hash_count + 1;
      IF pg_catalog.lower(v_v) = pg_catalog.lower(pg_catalog.btrim(v_ev.persisted_checksum_sha256)) THEN
        v_derived_matched := pg_catalog.array_append(v_derived_matched, v_k);
      END IF;
    END LOOP;

    IF v_hash_count <> pg_catalog.cardinality(NEW.tested_algorithms) THEN
      RAISE EXCEPTION 'verifier recomputed_hashes keys (%) must match tested_algorithms (%) 1-to-1',
        v_hash_count, pg_catalog.cardinality(NEW.tested_algorithms)
        USING ERRCODE = '23514';
    END IF;

    IF NOT (NEW.matched_algorithms <@ v_derived_matched
            AND v_derived_matched <@ NEW.matched_algorithms
            AND pg_catalog.cardinality(NEW.matched_algorithms) = pg_catalog.cardinality(v_derived_matched)) THEN
      RAISE EXCEPTION 'verifier matched_algorithms (%) does not match hashes equal to persisted_checksum_sha256 (%)',
        NEW.matched_algorithms, v_derived_matched
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Enforce payload SHA-256, recomputation agreement & B-02 independent discriminator confirmation
  IF NEW.verification_outcome_code = 'INDEPENDENTLY_REPRODUCED' THEN
    IF v_ev.input_payload_sha256 IS NULL
       OR pg_catalog.lower(pg_catalog.btrim(NEW.verified_payload_sha256)) <>
          pg_catalog.lower(pg_catalog.btrim(v_ev.input_payload_sha256)) THEN
      RAISE EXCEPTION 'INDEPENDENTLY_REPRODUCED requires verified_payload_sha256 to match evidence.input_payload_sha256'
        USING ERRCODE = '23514';
    END IF;
    IF NOT (NEW.matched_algorithms <@ v_ev.matched_algorithms
            AND v_ev.matched_algorithms <@ NEW.matched_algorithms
            AND pg_catalog.cardinality(NEW.matched_algorithms) = pg_catalog.cardinality(v_ev.matched_algorithms))
       OR NEW.recomputed_hashes IS DISTINCT FROM v_ev.recomputed_hashes THEN
      RAISE EXCEPTION 'INDEPENDENTLY_REPRODUCED requires matched_algorithms and recomputed_hashes to agree with evidence'
        USING ERRCODE = '23514';
    END IF;
    IF v_ev.provenance_basis_code = 'PAYLOAD_DISCRIMINATOR_FEATURE' THEN
      IF NEW.verified_discriminator_feature_code IS DISTINCT FROM v_ev.discriminator_feature_code
         OR NEW.verified_discriminator_json_path IS DISTINCT FROM v_ev.discriminator_json_path THEN
        RAISE EXCEPTION 'INDEPENDENTLY_REPRODUCED for PAYLOAD_DISCRIMINATOR_FEATURE must independently confirm discriminator_feature_code and discriminator_json_path'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  ELSIF NEW.verification_outcome_code = 'DISAGREEMENT_WITH_SCANNER' THEN
    IF (NEW.matched_algorithms <@ v_ev.matched_algorithms
        AND v_ev.matched_algorithms <@ NEW.matched_algorithms
        AND pg_catalog.cardinality(NEW.matched_algorithms) = pg_catalog.cardinality(v_ev.matched_algorithms))
       AND NEW.recomputed_hashes IS NOT DISTINCT FROM v_ev.recomputed_hashes
       AND (v_ev.provenance_basis_code <> 'PAYLOAD_DISCRIMINATOR_FEATURE'
            OR (NEW.verified_discriminator_feature_code IS NOT DISTINCT FROM v_ev.discriminator_feature_code
                AND NEW.verified_discriminator_json_path IS NOT DISTINCT FROM v_ev.discriminator_json_path)) THEN
      RAISE EXCEPTION 'DISAGREEMENT_WITH_SCANNER requires actual hash, matched_algorithms, or discriminator disagreement with evidence'
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.verification_outcome_code = 'PAYLOAD_DRIFT_DETECTED' THEN
    IF v_ev.input_payload_sha256 IS NOT NULL
       AND pg_catalog.lower(pg_catalog.btrim(NEW.verified_payload_sha256)) =
           pg_catalog.lower(pg_catalog.btrim(v_ev.input_payload_sha256)) THEN
      RAISE EXCEPTION 'PAYLOAD_DRIFT_DETECTED requires verified_payload_sha256 to differ from evidence.input_payload_sha256'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Verify 1-to-1 system_audit_event
  SELECT event_type_code, aggregate_type_code, aggregate_id, actor_user_id, occurred_at
  INTO v_audit
  FROM legal_builder.system_audit_event
  WHERE id = NEW.system_audit_event_id;

  IF NOT FOUND
     OR v_audit.event_type_code <> 'CHECKSUM_INDEPENDENT_VERIFICATION_RECORDED'
     OR v_audit.aggregate_type_code <> 'CHECKSUM_RECONCILIATION_EVIDENCE'
     OR v_audit.aggregate_id <> NEW.evidence_id::text
     OR v_audit.actor_user_id IS DISTINCT FROM NEW.verified_by_user_id
     OR v_audit.occurred_at > NEW.verified_at
     OR (NEW.verified_at - v_audit.occurred_at) > interval '5 minutes' THEN
    RAISE EXCEPTION 'system_audit_event % does not match independent verification for evidence %',
      NEW.system_audit_event_id, NEW.evidence_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER tr_independent_verification_guard
  BEFORE INSERT ON legal_builder.checksum_independent_verification
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.guard_independent_verification_insert();

CREATE TRIGGER tr_independent_verification_immutable
  BEFORE UPDATE OR DELETE ON legal_builder.checksum_independent_verification
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER tr_independent_verification_no_truncate
  BEFORE TRUNCATE ON legal_builder.checksum_independent_verification
  FOR EACH STATEMENT
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

-- -----------------------------------------------------------------------------
-- 11. C-01: Tier-2 Append-Only Governance Approval Table
-- -----------------------------------------------------------------------------
CREATE TABLE legal_builder.checksum_reconciliation_approval (
  id uuid PRIMARY KEY,
  evidence_id uuid NOT NULL REFERENCES legal_builder.checksum_reconciliation_evidence(id),
  sequence integer NOT NULL,
  supersedes_approval_id uuid REFERENCES legal_builder.checksum_reconciliation_approval(id),
  decision_code text NOT NULL,
  attested_algorithm_code text,
  independent_verification_id uuid REFERENCES legal_builder.checksum_independent_verification(id),
  system_audit_event_id uuid NOT NULL REFERENCES legal_builder.system_audit_event(id),
  approved_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  approved_by_db_role text NOT NULL DEFAULT current_user,
  approver_role_code text NOT NULL REFERENCES legal_builder.system_role_definition(code),
  governance_decision_ref text NOT NULL,
  rationale text NOT NULL,
  external_evidence_uri text,
  external_evidence_sha256 char(64),
  approved_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT uq_reconciliation_approval_seq UNIQUE (evidence_id, sequence),
  CONSTRAINT uq_reconciliation_approval_audit UNIQUE (system_audit_event_id),
  CONSTRAINT ck_reconciliation_approval_seq_pos CHECK (sequence > 0),
  CONSTRAINT ck_reconciliation_approval_supersede CHECK (
    (sequence = 1 AND supersedes_approval_id IS NULL)
    OR (sequence > 1 AND supersedes_approval_id IS NOT NULL)
  ),
  CONSTRAINT ck_reconciliation_approval_decision CHECK (
    decision_code IN (
      'ATTEST_HISTORICAL_PROVENANCE',
      'CONFIRM_AMBIGUOUS_ACCEPTED',
      'CONFIRM_UNREPRODUCIBLE_ACCEPTED',
      'ESCALATE_INTEGRITY_INCIDENT',
      'REJECT_ATTESTATION'
    )
  ),
  CONSTRAINT ck_reconciliation_approval_reject_seq CHECK (
    decision_code <> 'REJECT_ATTESTATION' OR sequence > 1
  ),
  CONSTRAINT ck_reconciliation_approval_attested_alg CHECK (
    (decision_code = 'ATTEST_HISTORICAL_PROVENANCE'
      AND attested_algorithm_code IN (
        'LEGACY_JSON_STRINGIFY_SHA256',
        'CANONICAL_JSON_V1_SHA256'
      ))
    OR (decision_code <> 'ATTEST_HISTORICAL_PROVENANCE'
      AND attested_algorithm_code IS NULL)
  ),
  CONSTRAINT ck_reconciliation_approval_text CHECK (
    btrim(approved_by_db_role) <> ''
    AND btrim(governance_decision_ref) <> ''
    AND btrim(rationale) <> ''
  ),
  CONSTRAINT ck_reconciliation_approval_ext_pair CHECK (
    (external_evidence_sha256 IS NULL AND (external_evidence_uri IS NULL OR btrim(external_evidence_uri) <> ''))
    OR (external_evidence_sha256 ~ '^[0-9A-Fa-f]{64}$' AND btrim(COALESCE(external_evidence_uri, '')) <> '')
  )
);

CREATE INDEX ix_checksum_reconciliation_approval_evidence
  ON legal_builder.checksum_reconciliation_approval (evidence_id, sequence DESC);

CREATE OR REPLACE FUNCTION legal_builder.guard_reconciliation_approval_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  v_tx_actor text;
  v_tx_auth text;
  v_ev record;
  v_reconciler record;
  v_triggered record;
  v_approver record;
  v_verif record;
  v_prev record;
  v_audit record;
BEGIN
  NEW.approved_by_db_role := current_user;

  v_tx_actor := NULLIF(pg_catalog.btrim(COALESCE(pg_catalog.current_setting('ulh.tx_actor_user_id', true), '')), '');
  v_tx_auth  := NULLIF(pg_catalog.btrim(COALESCE(pg_catalog.current_setting('ulh.tx_auth_method', true), '')), '');

  IF v_tx_actor IS NULL
     OR v_tx_actor !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     OR v_tx_actor::uuid IS DISTINCT FROM NEW.approved_by_user_id
     OR v_tx_auth <> 'LOCAL_HMAC_SESSION' THEN
    RAISE EXCEPTION 'governance approval requires set_tx_actor_context() with LOCAL_HMAC_SESSION'
      USING ERRCODE = '42501';
  END IF;

  -- C-01 Lock 1: Shared evidence-level advisory lock synchronized with checksum_independent_verification
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('checksum_evidence_governance:' || NEW.evidence_id::text, 0)
  );

  -- Lock 2..4 (strict alphabetical): system_role_definition -> user_account -> user_system_role_assignment
  SELECT out_person_id AS person_id, out_provider_code AS external_provider_code, out_external_subject AS external_subject
  INTO v_approver
  FROM legal_builder.verify_and_lock_approver_rbac(NEW.approved_by_user_id, NEW.approver_role_code);

  -- Load Tier-1 evidence
  SELECT id, classification_outcome, persisted_algorithm_code, provenance_basis_code,
         matched_algorithms, discriminator_feature_code, discriminator_json_path,
         reconciled_by_user_id, triggered_by_user_id, reconciled_by_db_role
  INTO v_ev
  FROM legal_builder.checksum_reconciliation_evidence
  WHERE id = NEW.evidence_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reconciliation evidence % does not exist', NEW.evidence_id
      USING ERRCODE = '23503';
  END IF;

  -- 5-Dimension Authenticated Four-Eyes Check
  SELECT id, person_id, external_subject INTO v_reconciler
  FROM legal_builder.user_account WHERE id = v_ev.reconciled_by_user_id;

  IF NEW.approved_by_user_id = v_reconciler.id
     OR (v_reconciler.person_id IS NOT NULL AND v_approver.person_id = v_reconciler.person_id)
     OR pg_catalog.lower(pg_catalog.btrim(v_approver.external_subject)) =
        pg_catalog.lower(pg_catalog.btrim(v_reconciler.external_subject)) THEN
    RAISE EXCEPTION 'four-eyes violation: approver % matches reconciler identity on evidence %',
      NEW.approved_by_user_id, NEW.evidence_id
      USING ERRCODE = '55000';
  END IF;

  IF v_ev.triggered_by_user_id IS NOT NULL THEN
    SELECT id, person_id, external_subject INTO v_triggered
    FROM legal_builder.user_account WHERE id = v_ev.triggered_by_user_id;
    IF NEW.approved_by_user_id = v_triggered.id
       OR (v_triggered.person_id IS NOT NULL AND v_approver.person_id = v_triggered.person_id)
       OR pg_catalog.lower(pg_catalog.btrim(v_approver.external_subject)) =
          pg_catalog.lower(pg_catalog.btrim(v_triggered.external_subject)) THEN
      RAISE EXCEPTION 'four-eyes violation: approver % matches initiator of evidence %',
        NEW.approved_by_user_id, NEW.evidence_id
        USING ERRCODE = '55000';
    END IF;
  END IF;

  IF v_ev.reconciled_by_db_role = 'ulh_reconciler' AND NEW.approved_by_db_role = 'ulh_reconciler' THEN
    RAISE EXCEPTION 'four-eyes DB-role violation: ulh_reconciler cannot insert governance approvals'
      USING ERRCODE = '42501';
  END IF;

  -- Exact 6 x 5 Outcome x Decision Matrix (12 ALLOWED / 18 DENIED)
  IF NEW.decision_code = 'ATTEST_HISTORICAL_PROVENANCE' THEN
    IF v_ev.classification_outcome NOT IN ('HASH_MATCH_ONLY_UNPROVEN_PROVENANCE', 'MULTI_ALGORITHM_HASH_COLLISION_EQUIVALENT')
       OR v_ev.persisted_algorithm_code = 'RFC8785_JCS' THEN
      RAISE EXCEPTION 'ATTEST_HISTORICAL_PROVENANCE denied for outcome % / marker %',
        v_ev.classification_outcome, v_ev.persisted_algorithm_code
        USING ERRCODE = '23514';
    END IF;
    IF NOT (NEW.attested_algorithm_code = ANY(v_ev.matched_algorithms)) THEN
      RAISE EXCEPTION 'cannot attest algorithm % not present in matched_algorithms of evidence %',
        NEW.attested_algorithm_code, NEW.evidence_id
        USING ERRCODE = '23514';
    END IF;

    -- B-02 & C-01: PAYLOAD_DISCRIMINATOR_FEATURE requires valid Tier-1.5 independent verification
    -- (with confirmed discriminator feature & JSON path) and ZERO subsequent conflict.
    IF v_ev.provenance_basis_code = 'PAYLOAD_DISCRIMINATOR_FEATURE' THEN
      IF NEW.independent_verification_id IS NULL THEN
        RAISE EXCEPTION 'ATTEST_HISTORICAL_PROVENANCE for PAYLOAD_DISCRIMINATOR_FEATURE requires independent_verification_id'
          USING ERRCODE = '23514';
      END IF;
      SELECT id, evidence_id, verification_outcome_code, verified_at,
             verified_discriminator_feature_code, verified_discriminator_json_path
      INTO v_verif
      FROM legal_builder.checksum_independent_verification
      WHERE id = NEW.independent_verification_id;

      IF NOT FOUND
         OR v_verif.evidence_id <> NEW.evidence_id
         OR v_verif.verification_outcome_code <> 'INDEPENDENTLY_REPRODUCED'
         OR v_verif.verified_discriminator_feature_code IS DISTINCT FROM v_ev.discriminator_feature_code
         OR v_verif.verified_discriminator_json_path IS DISTINCT FROM v_ev.discriminator_json_path THEN
        RAISE EXCEPTION 'independent_verification_id % is not a matching INDEPENDENTLY_REPRODUCED record for evidence %',
          NEW.independent_verification_id, NEW.evidence_id
          USING ERRCODE = '23514';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM legal_builder.checksum_independent_verification x
        WHERE x.evidence_id = NEW.evidence_id
          AND x.verified_at >= v_verif.verified_at
          AND x.verification_outcome_code IN ('DISAGREEMENT_WITH_SCANNER', 'PAYLOAD_DRIFT_DETECTED', 'LOCATOR_UNREACHABLE')
      ) THEN
        RAISE EXCEPTION 'cannot attest evidence % because unresolved verifier disagreement/drift exists', NEW.evidence_id
          USING ERRCODE = '23514';
      END IF;
    ELSE
      IF pg_catalog.btrim(COALESCE(NEW.external_evidence_uri, '')) = ''
         OR NEW.external_evidence_sha256 IS NULL THEN
        RAISE EXCEPTION 'ATTEST_HISTORICAL_PROVENANCE for outcome % / basis % requires external_evidence_uri and external_evidence_sha256',
          v_ev.classification_outcome, v_ev.provenance_basis_code
          USING ERRCODE = '23514';
      END IF;
    END IF;

  ELSIF NEW.decision_code = 'CONFIRM_AMBIGUOUS_ACCEPTED' THEN
    IF v_ev.classification_outcome <> 'MULTI_ALGORITHM_HASH_COLLISION_EQUIVALENT' THEN
      RAISE EXCEPTION 'CONFIRM_AMBIGUOUS_ACCEPTED denied for outcome %', v_ev.classification_outcome
        USING ERRCODE = '23514';
    END IF;

  ELSIF NEW.decision_code = 'CONFIRM_UNREPRODUCIBLE_ACCEPTED' THEN
    IF v_ev.classification_outcome <> 'UNREPRODUCIBLE_HISTORICAL' THEN
      RAISE EXCEPTION 'CONFIRM_UNREPRODUCIBLE_ACCEPTED denied for outcome %', v_ev.classification_outcome
        USING ERRCODE = '23514';
    END IF;

  ELSIF NEW.decision_code = 'REJECT_ATTESTATION' THEN
    IF v_ev.classification_outcome NOT IN ('HASH_MATCH_ONLY_UNPROVEN_PROVENANCE', 'MULTI_ALGORITHM_HASH_COLLISION_EQUIVALENT') THEN
      RAISE EXCEPTION 'REJECT_ATTESTATION denied for outcome %', v_ev.classification_outcome
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.sequence > 1 THEN
    SELECT evidence_id, sequence, decision_code INTO v_prev
    FROM legal_builder.checksum_reconciliation_approval
    WHERE id = NEW.supersedes_approval_id;
    IF NOT FOUND OR v_prev.evidence_id <> NEW.evidence_id OR v_prev.sequence <> NEW.sequence - 1 THEN
      RAISE EXCEPTION 'invalid supersedes_approval_id % for evidence % sequence %',
        NEW.supersedes_approval_id, NEW.evidence_id, NEW.sequence
        USING ERRCODE = '23514';
    END IF;
    IF NEW.decision_code = 'REJECT_ATTESTATION' AND v_prev.decision_code <> 'ATTEST_HISTORICAL_PROVENANCE' THEN
      RAISE EXCEPTION 'REJECT_ATTESTATION can only supersede an ATTEST_HISTORICAL_PROVENANCE row (got %)',
        v_prev.decision_code
        USING ERRCODE = '23514';
    END IF;
  END IF;

  SELECT event_type_code, aggregate_type_code, aggregate_id, actor_user_id, occurred_at
  INTO v_audit
  FROM legal_builder.system_audit_event
  WHERE id = NEW.system_audit_event_id;

  IF NOT FOUND
     OR v_audit.aggregate_type_code <> 'CHECKSUM_RECONCILIATION_EVIDENCE'
     OR v_audit.aggregate_id <> NEW.evidence_id::text
     OR v_audit.actor_user_id IS DISTINCT FROM NEW.approved_by_user_id
     OR v_audit.event_type_code <> ('CHECKSUM_RECONCILIATION_' || NEW.decision_code)
     OR v_audit.occurred_at > NEW.approved_at
     OR (NEW.approved_at - v_audit.occurred_at) > interval '5 minutes' THEN
    RAISE EXCEPTION 'system_audit_event % does not match approval decision/actor/evidence/window for evidence %',
      NEW.system_audit_event_id, NEW.evidence_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER tr_reconciliation_approval_guard
  BEFORE INSERT ON legal_builder.checksum_reconciliation_approval
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.guard_reconciliation_approval_insert();

CREATE TRIGGER tr_reconciliation_approval_immutable
  BEFORE UPDATE OR DELETE ON legal_builder.checksum_reconciliation_approval
  FOR EACH ROW
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER tr_reconciliation_approval_no_truncate
  BEFORE TRUNCATE ON legal_builder.checksum_reconciliation_approval
  FOR EACH STATEMENT
  EXECUTE FUNCTION legal_builder.reject_immutable_change();

-- -----------------------------------------------------------------------------
-- 12. Unconditional Least-Privilege Grants for ALL New/Replaced 0032 Objects
-- Revoke schema creation from PUBLIC and runtime
REVOKE CREATE ON SCHEMA legal_builder FROM PUBLIC;
REVOKE CREATE ON SCHEMA legal_builder FROM ulh_app_runtime;
GRANT USAGE ON SCHEMA legal_builder TO ulh_app_runtime, ulh_reconciler, ulh_governance_approver;

--     (Precondition at Step 0 guarantees all 4 roles exist & existing functions
--      already have PUBLIC EXECUTE revoked.)
-- -----------------------------------------------------------------------------
REVOKE ALL ON TABLE
  legal_builder.checksum_reconciliation_evidence,
  legal_builder.checksum_independent_verification,
  legal_builder.checksum_reconciliation_approval
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  legal_builder.is_valid_algorithm_set(text[]),
  legal_builder.is_valid_non_empty_algorithm_set(text[]),
  legal_builder.set_tx_actor_context(uuid, text),
  legal_builder.verify_and_lock_approver_rbac(uuid, text),
  legal_builder.enforce_new_checksum_algorithm_jcs(),
  legal_builder.guard_merge_operation_watermark_init(),
  legal_builder.guard_merge_operation_immutability(),
  legal_builder.guard_merge_conflict_parent(),
  legal_builder.guard_merge_resolution_open_operation(),
  legal_builder.guard_publishing_job_transition(),
  legal_builder.guard_sealed_release_package(),
  legal_builder.enforce_release_package_jcs_on_seal(),
  legal_builder.guard_sealed_release_package_item(),
  legal_builder.guard_system_audit_event_role_scope(),
  legal_builder.bind_reconciliation_evidence_actor(),
  legal_builder.verify_reconciliation_evidence_insert(),
  legal_builder.guard_independent_verification_insert(),
  legal_builder.guard_reconciliation_approval_insert()
FROM PUBLIC;

-- ulh_app_runtime: read-only on new 0032 tables + helper EXECUTE
GRANT EXECUTE ON FUNCTION
  legal_builder.is_valid_algorithm_set(text[]),
  legal_builder.is_valid_non_empty_algorithm_set(text[]),
  legal_builder.set_tx_actor_context(uuid, text)
TO ulh_app_runtime;

GRANT SELECT ON TABLE
  legal_builder.checksum_reconciliation_evidence,
  legal_builder.checksum_independent_verification,
  legal_builder.checksum_reconciliation_approval
TO ulh_app_runtime;

-- ulh_reconciler: Tier-1 writer ONLY (no INSERT on Tier 1.5 or Tier 2)
GRANT EXECUTE ON FUNCTION
  legal_builder.is_valid_algorithm_set(text[]),
  legal_builder.is_valid_non_empty_algorithm_set(text[]),
  legal_builder.set_tx_actor_context(uuid, text)
TO ulh_reconciler;

GRANT SELECT, INSERT ON TABLE legal_builder.checksum_reconciliation_evidence TO ulh_reconciler;
GRANT SELECT ON TABLE
  legal_builder.checksum_independent_verification,
  legal_builder.checksum_reconciliation_approval
TO ulh_reconciler;

-- ulh_governance_approver: Tier-1.5 & Tier-2 writer ONLY (no INSERT on Tier 1)
GRANT EXECUTE ON FUNCTION
  legal_builder.is_valid_algorithm_set(text[]),
  legal_builder.is_valid_non_empty_algorithm_set(text[]),
  legal_builder.set_tx_actor_context(uuid, text),
  legal_builder.verify_and_lock_approver_rbac(uuid, text)
TO ulh_governance_approver;

GRANT SELECT ON TABLE legal_builder.checksum_reconciliation_evidence TO ulh_governance_approver;
GRANT SELECT, INSERT ON TABLE
  legal_builder.checksum_independent_verification,
  legal_builder.checksum_reconciliation_approval
TO ulh_governance_approver;


-- -----------------------------------------------------------------------------
-- 13. ULH-EXEC-016: Immutable Lock-Only PK Guards
--     Guards the 4 LOCK-ONLY columns against mutation via ulh_app_runtime or any
--     role while permitting SELECT ... FOR SHARE and valid business UPDATEs on
--     non-primary-key columns.
-- -----------------------------------------------------------------------------

-- 13.1. legal_document_type_definition.code
CREATE OR REPLACE FUNCTION legal_builder.guard_legal_document_type_definition_pk_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, legal_builder
AS $$
BEGIN
    IF NEW.code IS DISTINCT FROM OLD.code THEN
        RAISE EXCEPTION 'Column legal_document_type_definition.code is immutable and cannot be updated'
            USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;
ALTER FUNCTION legal_builder.guard_legal_document_type_definition_pk_immutable() OWNER TO ulh_migrator;

DROP TRIGGER IF EXISTS tr_guard_legal_document_type_definition_pk_immutable ON legal_builder.legal_document_type_definition;
CREATE TRIGGER tr_guard_legal_document_type_definition_pk_immutable
    BEFORE UPDATE OF code ON legal_builder.legal_document_type_definition
    FOR EACH ROW
    EXECUTE FUNCTION legal_builder.guard_legal_document_type_definition_pk_immutable();

-- 13.2. amendment_target.id
CREATE OR REPLACE FUNCTION legal_builder.guard_amendment_target_pk_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, legal_builder
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Column amendment_target.id is immutable and cannot be updated'
            USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;
ALTER FUNCTION legal_builder.guard_amendment_target_pk_immutable() OWNER TO ulh_migrator;

DROP TRIGGER IF EXISTS tr_guard_amendment_target_pk_immutable ON legal_builder.amendment_target;
CREATE TRIGGER tr_guard_amendment_target_pk_immutable
    BEFORE UPDATE OF id ON legal_builder.amendment_target
    FOR EACH ROW
    EXECUTE FUNCTION legal_builder.guard_amendment_target_pk_immutable();

-- 13.3. review_round.id
CREATE OR REPLACE FUNCTION legal_builder.guard_review_round_pk_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, legal_builder
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Column review_round.id is immutable and cannot be updated'
            USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;
ALTER FUNCTION legal_builder.guard_review_round_pk_immutable() OWNER TO ulh_migrator;

DROP TRIGGER IF EXISTS tr_guard_review_round_pk_immutable ON legal_builder.review_round;
CREATE TRIGGER tr_guard_review_round_pk_immutable
    BEFORE UPDATE OF id ON legal_builder.review_round
    FOR EACH ROW
    EXECUTE FUNCTION legal_builder.guard_review_round_pk_immutable();

-- 13.4. project_creation_profile.project_id
CREATE OR REPLACE FUNCTION legal_builder.guard_project_creation_profile_pk_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, legal_builder
AS $$
BEGIN
    IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
        RAISE EXCEPTION 'Column project_creation_profile.project_id is immutable and cannot be updated'
            USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;
ALTER FUNCTION legal_builder.guard_project_creation_profile_pk_immutable() OWNER TO ulh_migrator;

DROP TRIGGER IF EXISTS tr_guard_project_creation_profile_pk_immutable ON legal_builder.project_creation_profile;
CREATE TRIGGER tr_guard_project_creation_profile_pk_immutable
    BEFORE UPDATE OF project_id ON legal_builder.project_creation_profile
    FOR EACH ROW
    EXECUTE FUNCTION legal_builder.guard_project_creation_profile_pk_immutable();

-- Revoke execute from PUBLIC and grant to runtime/migrator
REVOKE ALL ON FUNCTION
    legal_builder.guard_legal_document_type_definition_pk_immutable(),
    legal_builder.guard_amendment_target_pk_immutable(),
    legal_builder.guard_review_round_pk_immutable(),
    legal_builder.guard_project_creation_profile_pk_immutable()
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
    legal_builder.guard_legal_document_type_definition_pk_immutable(),
    legal_builder.guard_amendment_target_pk_immutable(),
    legal_builder.guard_review_round_pk_immutable(),
    legal_builder.guard_project_creation_profile_pk_immutable()
TO ulh_migrator, ulh_app_runtime;

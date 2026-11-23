-- =============================================================================
-- Migration: 0033_reconciliation_and_evidence_hardening.sql
-- Workstream: TASK-003 Remediation & Staging Final Acceptance (ULH-EXEC-019)
-- Purpose:
--   1. R19-01: Fix safe NULL handling in 4 transaction-actor authentication check points.
--   2. R19-02: Align Four-Eyes checks to ULH single-user model (remove multi-human requirements
--              while preserving technical verification independence, user approval & RBAC).
--   3. R19-03: Enforce strict PAYLOAD_DRIFT_DETECTED prerequisites (both input & verified
--              payload hashes must be present, valid 64-hex SHA-256 and distinct).
--   4. R19-04: Unify migration provenance name to 0032_checksum_algorithm_markers_and_jcs_enforcement.sql.
--   5. R19-09: Implement strict JSON Pointer (RFC 6901) & JSONPath locator syntax validator.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Pre-condition Check (Fail-Closed)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.legal_builder_schema_migration
    WHERE name = '0032_checksum_algorithm_markers_and_jcs_enforcement.sql'
  ) THEN
    RAISE EXCEPTION 'MIGRATION 0033 PRECONDITION FAILED: Migration 0032 must be applied first'
      USING ERRCODE = '55000';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. R19-09: Locator Syntax Validator Function (JSON Pointer RFC 6901 & JSONPath)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION legal_builder.is_valid_locator_syntax(p_locator text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_locator IS NULL OR btrim(p_locator) = '' THEN
    RETURN false;
  END IF;

  -- RFC 6901 JSON Pointer: must start with / and only allow valid tokens (~0 for ~, ~1 for /)
  IF p_locator ~ '^/' THEN
    RETURN p_locator ~ '^/(?:[^/~]|~[01])*(?:/(?:[^/~]|~[01])*)*$';
  END IF;

  -- Standard JSONPath: must start with $ and have valid segment notation
  IF p_locator ~ '^\$' THEN
    RETURN p_locator ~ '^\$(?:\.[a-zA-Z_][a-zA-Z0-9_-]*|\[(?:\d+|''[^'']+''|"[^"]+")\])*$';
  END IF;

  RETURN false;
END;
$$;
ALTER FUNCTION legal_builder.is_valid_locator_syntax(text) OWNER TO ulh_migrator;

-- -----------------------------------------------------------------------------
-- 2. R19-04 & R19-09: Update Constraint on checksum_reconciliation_evidence
--    - Fix migration name to 0032_checksum_algorithm_markers_and_jcs_enforcement.sql
--    - Enforce rigorous JSON Pointer / JSONPath locator syntax
-- -----------------------------------------------------------------------------
ALTER TABLE legal_builder.checksum_reconciliation_evidence
  DROP CONSTRAINT IF EXISTS ck_reconciliation_provenance_basis;

ALTER TABLE legal_builder.checksum_reconciliation_evidence
  ADD CONSTRAINT ck_reconciliation_provenance_basis CHECK (
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
      AND verified_migration_name IS NOT DISTINCT FROM '0014_snapshot_checksum_algorithm.sql'
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
      AND verified_migration_name IS NOT DISTINCT FROM '0032_checksum_algorithm_markers_and_jcs_enforcement.sql'
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
      AND input_payload_sha256 IS NOT NULL
      AND input_payload_sha256 ~ '^[0-9A-Fa-f]{64}$'
      AND discriminator_feature_code IN (
        'NUMERIC_KEY_ORDERING',
        'NUMBER_SERIALIZATION_ECMA262',
        'UNICODE_CODE_UNIT_SORT',
        'KEY_INSERTION_ORDER'
      )
      AND legal_builder.is_valid_locator_syntax(discriminator_json_path)
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
      AND artifact_sha256 IS NOT NULL
      AND artifact_sha256 ~ '^[0-9A-Fa-f]{64}$'
      AND btrim(COALESCE(artifact_issuer, '')) <> ''
      AND verified_migration_name IS NULL
      AND verified_trigger_name IS NULL
      AND discriminator_feature_code IS NULL
      AND discriminator_json_path IS NULL)
  );

-- -----------------------------------------------------------------------------
-- 3. R19-01: Fix set_tx_actor_context() (Safe NULL Check on p_auth_method)
-- -----------------------------------------------------------------------------
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
  IF p_user_id IS NULL
     OR p_auth_method IS NULL
     OR p_auth_method NOT IN ('LOCAL_HMAC_SESSION', 'RECONCILER_SERVICE_PRINCIPAL') THEN
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
ALTER FUNCTION legal_builder.set_tx_actor_context(uuid, text) OWNER TO ulh_migrator;

-- -----------------------------------------------------------------------------
-- 4. R19-01: Fix bind_reconciliation_evidence_actor() (Safe NULL Check on v_tx_auth)
-- -----------------------------------------------------------------------------
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
     OR v_tx_auth IS NULL
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

  IF v_run_audit.metadata IS NULL
     OR pg_catalog.jsonb_typeof(v_run_audit.metadata) <> 'object'
     OR pg_catalog.jsonb_typeof(v_run_audit.metadata->'initiationMode') <> 'string'
     OR (v_run_audit.metadata->>'initiationMode') <> NEW.initiation_mode_code THEN
    RAISE EXCEPTION 'run_audit_event metadata initiationMode does not match evidence %', NEW.initiation_mode_code
      USING ERRCODE = '23514';
  END IF;

  IF NEW.initiation_mode_code = 'HUMAN_TRIGGERED' THEN
    IF (v_run_audit.metadata->>'triggeredByUserId') IS DISTINCT FROM NEW.triggered_by_user_id::text THEN
      RAISE EXCEPTION 'run_audit_event metadata triggeredByUserId does not match evidence %', NEW.triggered_by_user_id
        USING ERRCODE = '23514';
    END IF;
  ELSE
    IF (v_run_audit.metadata->>'automationSourceRef') IS DISTINCT FROM NEW.automation_source_ref THEN
      RAISE EXCEPTION 'run_audit_event metadata automationSourceRef does not match evidence %', NEW.automation_source_ref
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END $$;
ALTER FUNCTION legal_builder.bind_reconciliation_evidence_actor() OWNER TO ulh_migrator;

-- -----------------------------------------------------------------------------
-- 5. R19-01, R19-02, R19-03: Fix guard_independent_verification_insert()
--    - Safe NULL check on v_tx_auth (IS DISTINCT FROM)
--    - Remove multi-human Four-Eyes separation checks (single-user model alignment)
--    - Enforce technical independence (engine ID & runtime family must differ)
--    - Strict PAYLOAD_DRIFT_DETECTED validation (input & verified hashes required, valid 64-hex & distinct)
-- -----------------------------------------------------------------------------
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
     OR v_tx_auth IS DISTINCT FROM 'LOCAL_HMAC_SESSION' THEN
    RAISE EXCEPTION 'independent verification requires set_tx_actor_context() with LOCAL_HMAC_SESSION'
      USING ERRCODE = '42501';
  END IF;

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

  -- Technical independence: verifier engine and runtime family must differ from scanner
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

  -- Human verification accountability check (active human account required)
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

  -- Recomputed hashes validation on Tier-1.5 verification
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

  -- Enforce payload SHA-256 agreement & discriminator confirmation
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
    -- R19-03: Rigorous PAYLOAD_DRIFT_DETECTED prerequisites
    IF v_ev.input_payload_sha256 IS NULL
       OR v_ev.input_payload_sha256 !~ '^[0-9A-Fa-f]{64}$'
       OR NEW.verified_payload_sha256 IS NULL
       OR NEW.verified_payload_sha256 !~ '^[0-9A-Fa-f]{64}$'
       OR pg_catalog.lower(pg_catalog.btrim(NEW.verified_payload_sha256)) =
          pg_catalog.lower(pg_catalog.btrim(v_ev.input_payload_sha256)) THEN
      RAISE EXCEPTION 'PAYLOAD_DRIFT_DETECTED requires both valid input_payload_sha256 and verified_payload_sha256 to be present and distinct'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- 1-to-1 system_audit_event validation
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
ALTER FUNCTION legal_builder.guard_independent_verification_insert() OWNER TO ulh_migrator;

-- -----------------------------------------------------------------------------
-- 6. R19-01, R19-02: Fix guard_reconciliation_approval_insert()
--    - Safe NULL check on v_tx_auth (IS DISTINCT FROM)
--    - Remove multi-human Four-Eyes separation checks (single-user model alignment)
--    - Retain RBAC lock and CHECKSUM_RECONCILIATION_APPROVE permission verification
--    - Retain database role separation (ulh_reconciler cannot approve)
--    - Preserve exact 6 x 5 decision matrix (12 ALLOWED / 18 DENIED)
-- -----------------------------------------------------------------------------
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
     OR v_tx_auth IS DISTINCT FROM 'LOCAL_HMAC_SESSION' THEN
    RAISE EXCEPTION 'governance approval requires set_tx_actor_context() with LOCAL_HMAC_SESSION'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('checksum_evidence_governance:' || NEW.evidence_id::text, 0)
  );

  -- RBAC Lock & Validation (user must have CHECKSUM_RECONCILIATION_APPROVE)
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

  -- Technical DB role separation: ulh_reconciler cannot approve
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
ALTER FUNCTION legal_builder.guard_reconciliation_approval_insert() OWNER TO ulh_migrator;

-- -----------------------------------------------------------------------------
-- 7. R19-06: Least-Privilege Grants for All New & Replaced 0033 Functions
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION legal_builder.is_valid_locator_syntax(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION legal_builder.set_tx_actor_context(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION legal_builder.bind_reconciliation_evidence_actor() FROM PUBLIC;
REVOKE ALL ON FUNCTION legal_builder.guard_independent_verification_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION legal_builder.guard_reconciliation_approval_insert() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION legal_builder.is_valid_locator_syntax(text) TO ulh_app_runtime, ulh_reconciler, ulh_governance_approver;
GRANT EXECUTE ON FUNCTION legal_builder.set_tx_actor_context(uuid, text) TO ulh_app_runtime, ulh_reconciler, ulh_governance_approver;
GRANT EXECUTE ON FUNCTION legal_builder.bind_reconciliation_evidence_actor() TO ulh_reconciler;
GRANT EXECUTE ON FUNCTION legal_builder.guard_independent_verification_insert() TO ulh_governance_approver;
GRANT EXECUTE ON FUNCTION legal_builder.guard_reconciliation_approval_insert() TO ulh_governance_approver;

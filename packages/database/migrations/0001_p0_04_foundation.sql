BEGIN;

CREATE SCHEMA IF NOT EXISTS legal_builder;

CREATE TABLE legal_builder.legal_document_project (
    id uuid PRIMARY KEY,
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    document_type_code text NOT NULL,
    status_code text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL,
    created_by_user_id uuid NOT NULL,
    closed_at timestamptz,
    CONSTRAINT ck_project_code_not_blank CHECK (btrim(code) <> ''),
    CONSTRAINT ck_project_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT ck_project_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT ck_project_closed_after_created CHECK (closed_at IS NULL OR closed_at >= created_at)
);

CREATE TABLE legal_builder.legal_document (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL UNIQUE REFERENCES legal_builder.legal_document_project(id),
    relation_type_code text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL,
    created_by_user_id uuid NOT NULL,
    CONSTRAINT uq_legal_document_id_project UNIQUE (id, project_id),
    CONSTRAINT ck_legal_document_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE legal_builder.draft_branch (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
    code text NOT NULL,
    name text NOT NULL,
    purpose text NOT NULL,
    status text NOT NULL,
    forked_from_version_id uuid,
    created_at timestamptz NOT NULL,
    created_by_user_id uuid NOT NULL,
    created_by_person_id uuid,
    created_by_membership_id uuid,
    created_under_delegation_id uuid,
    closed_at timestamptz,
    closed_reason text,
    CONSTRAINT uq_branch_code_per_project UNIQUE (project_id, code),
    CONSTRAINT uq_branch_id_project UNIQUE (id, project_id),
    CONSTRAINT ck_branch_status CHECK (status IN ('ACTIVE', 'CLOSED', 'MERGED')),
    CONSTRAINT ck_branch_close_fields CHECK (
        (status = 'ACTIVE' AND closed_at IS NULL)
        OR (status IN ('CLOSED', 'MERGED') AND closed_at IS NOT NULL AND btrim(coalesce(closed_reason, '')) <> '')
    ),
    CONSTRAINT ck_branch_closed_after_created CHECK (closed_at IS NULL OR closed_at >= created_at)
);

CREATE TABLE legal_builder.asset (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
    status_code text NOT NULL,
    created_at timestamptz NOT NULL,
    created_by_user_id uuid NOT NULL,
    CONSTRAINT uq_asset_id_project UNIQUE (id, project_id)
);

CREATE TABLE legal_builder.asset_version (
    id uuid PRIMARY KEY,
    asset_id uuid NOT NULL REFERENCES legal_builder.asset(id),
    version_number bigint NOT NULL,
    media_type text NOT NULL,
    byte_size bigint NOT NULL,
    checksum_sha256 char(64) NOT NULL,
    original_file_name text NOT NULL,
    storage_key text NOT NULL UNIQUE,
    verification_status_code text NOT NULL,
    source_type_code text,
    source_id uuid,
    source_version_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL,
    created_by_user_id uuid NOT NULL,
    created_by_person_id uuid,
    CONSTRAINT uq_asset_version_number UNIQUE (asset_id, version_number),
    CONSTRAINT ck_asset_version_number_positive CHECK (version_number > 0),
    CONSTRAINT ck_asset_byte_size_nonnegative CHECK (byte_size >= 0),
    CONSTRAINT ck_asset_checksum_sha256 CHECK (checksum_sha256 ~ '^[0-9A-Fa-f]{64}$'),
    CONSTRAINT ck_asset_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT ck_asset_source_pair CHECK (
        (source_type_code IS NULL AND source_id IS NULL)
        OR (source_type_code IS NOT NULL AND source_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX uq_asset_version_id_asset
    ON legal_builder.asset_version(id, asset_id);

CREATE TABLE legal_builder.draft_workspace (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
    branch_id uuid NOT NULL UNIQUE,
    legal_document_id uuid NOT NULL,
    revision bigint NOT NULL DEFAULT 0,
    contract_version text NOT NULL,
    ruleset_definition_id uuid NOT NULL,
    ruleset_version_id uuid NOT NULL,
    ruleset_version_code text NOT NULL,
    document_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL,
    updated_by_user_id uuid NOT NULL,
    updated_by_person_id uuid,
    updated_by_membership_id uuid,
    updated_under_delegation_id uuid,
    CONSTRAINT uq_workspace_id_branch UNIQUE (id, branch_id),
    CONSTRAINT fk_workspace_branch_project FOREIGN KEY (branch_id, project_id)
        REFERENCES legal_builder.draft_branch(id, project_id),
    CONSTRAINT fk_workspace_document_project FOREIGN KEY (legal_document_id, project_id)
        REFERENCES legal_builder.legal_document(id, project_id),
    CONSTRAINT ck_workspace_revision_nonnegative CHECK (revision >= 0),
    CONSTRAINT ck_workspace_contract_version CHECK (contract_version IN ('1.0', '1.1')),
    CONSTRAINT ck_workspace_metadata_object CHECK (jsonb_typeof(document_metadata) = 'object')
);

CREATE TABLE legal_builder.workspace_legal_node (
    workspace_id uuid NOT NULL REFERENCES legal_builder.draft_workspace(id),
    legal_node_id uuid NOT NULL,
    node_type_code text NOT NULL,
    parent_node_id uuid,
    order_key text NOT NULL,
    title text,
    content_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    display_number text,
    display_number_locked boolean NOT NULL DEFAULT false,
    lifecycle_status_code text NOT NULL,
    updated_at timestamptz NOT NULL,
    updated_by_user_id uuid NOT NULL,
    PRIMARY KEY (workspace_id, legal_node_id),
    CONSTRAINT fk_workspace_node_parent FOREIGN KEY (workspace_id, parent_node_id)
        REFERENCES legal_builder.workspace_legal_node(workspace_id, legal_node_id)
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT ck_workspace_node_order_key CHECK (btrim(order_key) <> ''),
    CONSTRAINT ck_workspace_node_content_array CHECK (jsonb_typeof(content_blocks) = 'array'),
    CONSTRAINT ck_workspace_node_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT ck_workspace_node_not_self_parent CHECK (parent_node_id IS NULL OR parent_node_id <> legal_node_id)
);

CREATE UNIQUE INDEX uq_workspace_node_sibling_order
    ON legal_builder.workspace_legal_node (
        workspace_id,
        coalesce(parent_node_id, '00000000-0000-0000-0000-000000000000'::uuid),
        order_key
    );

CREATE INDEX ix_workspace_node_parent
    ON legal_builder.workspace_legal_node(workspace_id, parent_node_id, order_key);

CREATE TABLE legal_builder.draft_checkpoint (
    id uuid PRIMARY KEY,
    workspace_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    source_revision bigint NOT NULL,
    kind text NOT NULL,
    label text,
    reason text,
    contract_version text NOT NULL,
    document_snapshot jsonb NOT NULL,
    snapshot_checksum_sha256 char(64) NOT NULL,
    created_at timestamptz NOT NULL,
    created_by_user_id uuid NOT NULL,
    created_by_person_id uuid,
    created_by_membership_id uuid,
    CONSTRAINT uq_checkpoint_id_branch UNIQUE (id, branch_id),
    CONSTRAINT fk_checkpoint_workspace_branch FOREIGN KEY (workspace_id, branch_id)
        REFERENCES legal_builder.draft_workspace(id, branch_id),
    CONSTRAINT ck_checkpoint_source_revision CHECK (source_revision >= 0),
    CONSTRAINT ck_checkpoint_kind CHECK (kind IN ('AUTOMATIC', 'MANUAL', 'PRE_VERSION', 'PRE_RESTORE', 'PRE_MERGE')),
    CONSTRAINT ck_checkpoint_contract_version CHECK (contract_version IN ('1.0', '1.1')),
    CONSTRAINT ck_checkpoint_snapshot_object CHECK (jsonb_typeof(document_snapshot) = 'object'),
    CONSTRAINT ck_checkpoint_checksum CHECK (snapshot_checksum_sha256 ~ '^[0-9A-Fa-f]{64}$')
);

CREATE INDEX ix_checkpoint_workspace_created
    ON legal_builder.draft_checkpoint(workspace_id, created_at DESC);

CREATE TABLE legal_builder.draft_version (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
    branch_id uuid NOT NULL,
    legal_document_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    source_checkpoint_id uuid,
    contract_version text NOT NULL,
    ruleset_definition_id uuid NOT NULL,
    ruleset_version_id uuid NOT NULL,
    ruleset_version_code text NOT NULL,
    document_snapshot jsonb NOT NULL,
    snapshot_checksum_sha256 char(64) NOT NULL,
    sealed_at timestamptz NOT NULL,
    sealed_by_user_id uuid NOT NULL,
    sealed_by_person_id uuid,
    sealed_by_membership_id uuid,
    sealed_under_delegation_id uuid,
    CONSTRAINT uq_draft_version_code_per_project UNIQUE (project_id, code),
    CONSTRAINT uq_draft_version_id_project UNIQUE (id, project_id),
    CONSTRAINT fk_draft_version_branch_project FOREIGN KEY (branch_id, project_id)
        REFERENCES legal_builder.draft_branch(id, project_id),
    CONSTRAINT fk_draft_version_document_project FOREIGN KEY (legal_document_id, project_id)
        REFERENCES legal_builder.legal_document(id, project_id),
    CONSTRAINT fk_draft_version_checkpoint_branch FOREIGN KEY (source_checkpoint_id, branch_id)
        REFERENCES legal_builder.draft_checkpoint(id, branch_id),
    CONSTRAINT ck_draft_version_contract_version CHECK (contract_version IN ('1.0', '1.1')),
    CONSTRAINT ck_draft_version_snapshot_object CHECK (jsonb_typeof(document_snapshot) = 'object'),
    CONSTRAINT ck_draft_version_checksum CHECK (snapshot_checksum_sha256 ~ '^[0-9A-Fa-f]{64}$')
);

ALTER TABLE legal_builder.draft_branch
    ADD CONSTRAINT fk_branch_forked_version
    FOREIGN KEY (forked_from_version_id) REFERENCES legal_builder.draft_version(id)
    DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX ix_draft_version_project_sealed
    ON legal_builder.draft_version(project_id, sealed_at DESC);

CREATE TABLE legal_builder.draft_version_edge (
    version_id uuid NOT NULL REFERENCES legal_builder.draft_version(id),
    source_version_id uuid NOT NULL REFERENCES legal_builder.draft_version(id),
    edge_type text NOT NULL,
    source_order integer NOT NULL DEFAULT 0,
    PRIMARY KEY (version_id, source_version_id, edge_type),
    CONSTRAINT ck_version_edge_type CHECK (edge_type IN ('PARENT', 'MERGE_SOURCE')),
    CONSTRAINT ck_version_edge_not_self CHECK (version_id <> source_version_id),
    CONSTRAINT ck_version_edge_order_nonnegative CHECK (source_order >= 0)
);

CREATE UNIQUE INDEX uq_draft_version_primary_parent
    ON legal_builder.draft_version_edge(version_id)
    WHERE edge_type = 'PARENT';

CREATE TABLE legal_builder.draft_version_basis (
    id uuid PRIMARY KEY,
    version_id uuid NOT NULL REFERENCES legal_builder.draft_version(id),
    basis_type_code text NOT NULL,
    source_type_code text NOT NULL,
    source_id uuid NOT NULL,
    source_version_id uuid,
    role_code text NOT NULL,
    summary text NOT NULL,
    note text,
    recorded_at timestamptz NOT NULL,
    recorded_by_user_id uuid NOT NULL,
    recorded_by_person_id uuid,
    recorded_by_membership_id uuid,
    CONSTRAINT ck_version_basis_summary_not_blank CHECK (btrim(summary) <> '')
);

CREATE INDEX ix_version_basis_version ON legal_builder.draft_version_basis(version_id);
CREATE INDEX ix_version_basis_source ON legal_builder.draft_version_basis(source_type_code, source_id);

CREATE TABLE legal_builder.legal_node_version_state (
    draft_version_id uuid NOT NULL REFERENCES legal_builder.draft_version(id),
    legal_node_id uuid NOT NULL,
    exists_at_version boolean NOT NULL,
    node_type_code text NOT NULL,
    parent_node_id uuid,
    order_key text NOT NULL,
    display_number text,
    node_snapshot jsonb,
    PRIMARY KEY (draft_version_id, legal_node_id),
    CONSTRAINT fk_version_node_parent FOREIGN KEY (draft_version_id, parent_node_id)
        REFERENCES legal_builder.legal_node_version_state(draft_version_id, legal_node_id)
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT ck_version_node_snapshot_object CHECK (node_snapshot IS NULL OR jsonb_typeof(node_snapshot) = 'object'),
    CONSTRAINT ck_version_node_existence_snapshot CHECK (
        (exists_at_version AND node_snapshot IS NOT NULL)
        OR (NOT exists_at_version)
    ),
    CONSTRAINT ck_version_node_not_self_parent CHECK (parent_node_id IS NULL OR parent_node_id <> legal_node_id)
);

CREATE UNIQUE INDEX uq_version_node_sibling_order
    ON legal_builder.legal_node_version_state (
        draft_version_id,
        coalesce(parent_node_id, '00000000-0000-0000-0000-000000000000'::uuid),
        order_key
    )
    WHERE exists_at_version;

CREATE INDEX ix_version_node_parent
    ON legal_builder.legal_node_version_state(draft_version_id, parent_node_id, order_key);

CREATE TABLE legal_builder.draft_legal_node_change (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
    branch_id uuid NOT NULL REFERENCES legal_builder.draft_branch(id),
    legal_node_id uuid NOT NULL,
    change_type text NOT NULL,
    from_version_id uuid NOT NULL REFERENCES legal_builder.draft_version(id),
    effective_version_id uuid NOT NULL REFERENCES legal_builder.draft_version(id),
    before_state jsonb NOT NULL,
    after_state jsonb NOT NULL,
    reason text NOT NULL,
    proposed_by_user_id uuid NOT NULL,
    proposed_by_person_id uuid,
    performed_by_user_id uuid NOT NULL,
    performed_by_person_id uuid,
    decided_by_user_id uuid NOT NULL,
    decided_by_person_id uuid,
    decided_by_membership_id uuid,
    decided_under_delegation_id uuid,
    decided_at timestamptz NOT NULL,
    CONSTRAINT ck_draft_change_type CHECK (change_type IN (
        'DRAFT_ADD',
        'DRAFT_REMOVE',
        'DRAFT_RENUMBER',
        'DRAFT_MOVE',
        'DRAFT_CONTENT_CHANGE',
        'DRAFT_MOVE_AND_CONTENT_CHANGE'
    )),
    CONSTRAINT ck_draft_change_before_object CHECK (jsonb_typeof(before_state) = 'object'),
    CONSTRAINT ck_draft_change_after_object CHECK (jsonb_typeof(after_state) = 'object'),
    CONSTRAINT ck_draft_change_reason_not_blank CHECK (btrim(reason) <> ''),
    CONSTRAINT ck_draft_change_version_order CHECK (from_version_id <> effective_version_id)
);

CREATE INDEX ix_draft_change_node ON legal_builder.draft_legal_node_change(project_id, legal_node_id, decided_at);
CREATE INDEX ix_draft_change_effective_version ON legal_builder.draft_legal_node_change(effective_version_id);

CREATE TABLE legal_builder.draft_change_basis (
    change_id uuid NOT NULL REFERENCES legal_builder.draft_legal_node_change(id),
    source_type_code text NOT NULL,
    source_id uuid NOT NULL,
    source_version_id uuid,
    label text,
    PRIMARY KEY (change_id, source_type_code, source_id)
);

CREATE TABLE legal_builder.snapshot_asset_ref (
    draft_version_id uuid NOT NULL,
    project_id uuid NOT NULL,
    figure_id uuid NOT NULL,
    legal_node_id uuid NOT NULL,
    asset_id uuid NOT NULL REFERENCES legal_builder.asset(id),
    asset_version_id uuid NOT NULL,
    media_type text NOT NULL,
    byte_size bigint NOT NULL,
    checksum_sha256 char(64) NOT NULL,
    verification_status_code text NOT NULL,
    display_role_code text NOT NULL,
    alternative_text text NOT NULL,
    caption jsonb,
    source_type_code text,
    source_id uuid,
    source_version_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (draft_version_id, figure_id),
    CONSTRAINT fk_snapshot_asset_version_project FOREIGN KEY (draft_version_id, project_id)
        REFERENCES legal_builder.draft_version(id, project_id),
    CONSTRAINT fk_snapshot_asset_project FOREIGN KEY (asset_id, project_id)
        REFERENCES legal_builder.asset(id, project_id),
    CONSTRAINT fk_snapshot_asset_exact_version FOREIGN KEY (asset_version_id, asset_id)
        REFERENCES legal_builder.asset_version(id, asset_id),
    CONSTRAINT fk_snapshot_asset_node FOREIGN KEY (draft_version_id, legal_node_id)
        REFERENCES legal_builder.legal_node_version_state(draft_version_id, legal_node_id),
    CONSTRAINT ck_snapshot_asset_byte_size CHECK (byte_size >= 0),
    CONSTRAINT ck_snapshot_asset_checksum CHECK (checksum_sha256 ~ '^[0-9A-Fa-f]{64}$'),
    CONSTRAINT ck_snapshot_asset_alt_not_blank CHECK (btrim(alternative_text) <> ''),
    CONSTRAINT ck_snapshot_asset_caption_array CHECK (caption IS NULL OR jsonb_typeof(caption) = 'array'),
    CONSTRAINT ck_snapshot_asset_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT ck_snapshot_asset_source_pair CHECK (
        (source_type_code IS NULL AND source_id IS NULL)
        OR (source_type_code IS NOT NULL AND source_id IS NOT NULL)
    )
);

CREATE INDEX ix_snapshot_asset_version ON legal_builder.snapshot_asset_ref(asset_version_id);

CREATE OR REPLACE FUNCTION legal_builder.reject_immutable_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'immutable table %.% does not allow %', TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP
        USING ERRCODE = '55000';
END;
$$;

CREATE OR REPLACE FUNCTION legal_builder.enforce_workspace_revision_increment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.revision <> OLD.revision + 1 THEN
        RAISE EXCEPTION 'workspace revision must increase exactly by one (old %, new %)', OLD.revision, NEW.revision
            USING ERRCODE = '40001';
    END IF;
    IF NEW.updated_at <= OLD.updated_at THEN
        RAISE EXCEPTION 'workspace updated_at must increase'
            USING ERRCODE = '22007';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION legal_builder.ensure_draft_version_has_basis()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM legal_builder.draft_version_basis b
        WHERE b.version_id = NEW.id
    ) THEN
        RAISE EXCEPTION 'draft version % must have at least one basis', NEW.id
            USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION legal_builder.validate_draft_version_edge()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    target_project_id uuid;
    source_project_id uuid;
    creates_cycle boolean;
BEGIN
    SELECT project_id INTO target_project_id
    FROM legal_builder.draft_version
    WHERE id = NEW.version_id;

    SELECT project_id INTO source_project_id
    FROM legal_builder.draft_version
    WHERE id = NEW.source_version_id;

    IF target_project_id IS DISTINCT FROM source_project_id THEN
        RAISE EXCEPTION 'draft version edge must stay within one project'
            USING ERRCODE = '23514';
    END IF;

    WITH RECURSIVE ancestors(id) AS (
        SELECT NEW.source_version_id
        UNION
        SELECT e.source_version_id
        FROM legal_builder.draft_version_edge e
        JOIN ancestors a ON e.version_id = a.id
    )
    SELECT EXISTS (SELECT 1 FROM ancestors WHERE id = NEW.version_id)
    INTO creates_cycle;

    IF creates_cycle THEN
        RAISE EXCEPTION 'draft version edge creates a cycle'
            USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_workspace_revision_increment
BEFORE UPDATE ON legal_builder.draft_workspace
FOR EACH ROW EXECUTE FUNCTION legal_builder.enforce_workspace_revision_increment();

CREATE CONSTRAINT TRIGGER trg_draft_version_requires_basis
AFTER INSERT ON legal_builder.draft_version
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION legal_builder.ensure_draft_version_has_basis();

CREATE CONSTRAINT TRIGGER trg_draft_version_edge_valid
AFTER INSERT ON legal_builder.draft_version_edge
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION legal_builder.validate_draft_version_edge();

CREATE TRIGGER trg_asset_version_immutable
BEFORE UPDATE OR DELETE ON legal_builder.asset_version
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER trg_checkpoint_immutable
BEFORE UPDATE OR DELETE ON legal_builder.draft_checkpoint
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER trg_draft_version_immutable
BEFORE UPDATE OR DELETE ON legal_builder.draft_version
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER trg_version_edge_immutable
BEFORE UPDATE OR DELETE ON legal_builder.draft_version_edge
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER trg_version_basis_immutable
BEFORE UPDATE OR DELETE ON legal_builder.draft_version_basis
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER trg_version_node_state_immutable
BEFORE UPDATE OR DELETE ON legal_builder.legal_node_version_state
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER trg_draft_change_immutable
BEFORE UPDATE OR DELETE ON legal_builder.draft_legal_node_change
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER trg_draft_change_basis_immutable
BEFORE UPDATE OR DELETE ON legal_builder.draft_change_basis
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TRIGGER trg_snapshot_asset_ref_immutable
BEFORE UPDATE OR DELETE ON legal_builder.snapshot_asset_ref
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

COMMIT;

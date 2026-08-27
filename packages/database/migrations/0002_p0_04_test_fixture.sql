-- Dữ liệu hoàn toàn giả định. Tệp này luôn ROLLBACK và không dùng cho production seed.
BEGIN;

INSERT INTO legal_builder.legal_document_project (
    id, code, name, document_type_code, status_code, metadata, created_at, created_by_user_id
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'HS-SAMPLE-001',
    'Hồ sơ kiểm thử hợp đồng dữ liệu',
    'CIRCULAR_AMENDING_SAMPLE',
    'DRAFTING',
    '{"sample":true}'::jsonb,
    '2026-08-30T08:00:00+07:00',
    '00000000-0000-0000-0000-000000000101'
);

INSERT INTO legal_builder.legal_document (
    id, project_id, relation_type_code, metadata, created_at, created_by_user_id
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'AMENDING_DOCUMENT',
    '{}'::jsonb,
    '2026-08-30T08:00:00+07:00',
    '00000000-0000-0000-0000-000000000101'
);

INSERT INTO legal_builder.draft_branch (
    id, project_id, code, name, purpose, status,
    created_at, created_by_user_id, created_by_person_id
) VALUES (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'MAIN',
    'Nhánh hợp nhất mẫu',
    'Kiểm tra migration P0-04',
    'ACTIVE',
    '2026-08-30T08:05:00+07:00',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000102'
);

INSERT INTO legal_builder.asset (
    id, project_id, status_code, created_at, created_by_user_id
) VALUES (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'ACTIVE',
    '2026-08-30T08:10:00+07:00',
    '00000000-0000-0000-0000-000000000101'
);

INSERT INTO legal_builder.asset_version (
    id, asset_id, version_number, media_type, byte_size, checksum_sha256,
    original_file_name, storage_key, verification_status_code, metadata,
    created_at, created_by_user_id, created_by_person_id
) VALUES (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000010',
    1,
    'image/png',
    1024,
    '0000000000000000000000000000000000000000000000000000000000000000',
    'hinh-minh-hoa-gia-dinh.png',
    'sample/asset/00000000-0000-0000-0000-000000000011',
    'SAMPLE_NOT_VERIFIED',
    '{}'::jsonb,
    '2026-08-30T08:10:00+07:00',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000102'
);

INSERT INTO legal_builder.draft_workspace (
    id, project_id, branch_id, legal_document_id, revision, contract_version,
    ruleset_definition_id, ruleset_version_id, ruleset_version_code,
    document_metadata, updated_at, updated_by_user_id
) VALUES (
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    0,
    '1.1',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    '0.1',
    '{"sample":true}'::jsonb,
    '2026-08-30T08:15:00+07:00',
    '00000000-0000-0000-0000-000000000101'
);

INSERT INTO legal_builder.workspace_legal_node (
    workspace_id, legal_node_id, node_type_code, parent_node_id, order_key,
    title, content_blocks, metadata, display_number, lifecycle_status_code,
    updated_at, updated_by_user_id
) VALUES (
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000030',
    'ARTICLE',
    NULL,
    '0001',
    'Nút kiểm thử',
    '[{"kind":"PARAGRAPH","spans":[{"text":"Nội dung giả định"}]}]'::jsonb,
    '{}'::jsonb,
    'Điều 1',
    'ACTIVE',
    '2026-08-30T08:15:00+07:00',
    '00000000-0000-0000-0000-000000000101'
);

UPDATE legal_builder.draft_workspace
SET revision = 1,
    updated_at = '2026-08-30T08:16:00+07:00',
    updated_by_user_id = '00000000-0000-0000-0000-000000000101'
WHERE id = '00000000-0000-0000-0000-000000000020';

DO $$
BEGIN
    BEGIN
        UPDATE legal_builder.draft_workspace
        SET revision = 3,
            updated_at = '2026-08-30T08:17:00+07:00'
        WHERE id = '00000000-0000-0000-0000-000000000020';
        RAISE EXCEPTION 'expected invalid workspace revision update to fail';
    EXCEPTION
        WHEN serialization_failure THEN NULL;
    END;
END;
$$;

INSERT INTO legal_builder.draft_checkpoint (
    id, workspace_id, branch_id, source_revision, kind, label,
    contract_version, document_snapshot, snapshot_checksum_sha256,
    created_at, created_by_user_id
) VALUES (
    '00000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000003',
    1,
    'PRE_VERSION',
    'Checkpoint kiểm thử',
    '1.1',
    '{"contractVersion":"1.1","sample":true}'::jsonb,
    '1111111111111111111111111111111111111111111111111111111111111111',
    '2026-08-30T08:20:00+07:00',
    '00000000-0000-0000-0000-000000000101'
);

INSERT INTO legal_builder.draft_version (
    id, project_id, branch_id, legal_document_id, code, name,
    source_checkpoint_id, contract_version,
    ruleset_definition_id, ruleset_version_id, ruleset_version_code,
    document_snapshot, snapshot_checksum_sha256,
    sealed_at, sealed_by_user_id
) VALUES
(
    '00000000-0000-0000-0000-000000000050',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'DT-005',
    'Phiên bản nguồn giả định',
    '00000000-0000-0000-0000-000000000040',
    '1.1',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    '0.1',
    '{"contractVersion":"1.1","sample":"DT-005"}'::jsonb,
    '2222222222222222222222222222222222222222222222222222222222222222',
    '2026-08-30T08:25:00+07:00',
    '00000000-0000-0000-0000-000000000101'
),
(
    '00000000-0000-0000-0000-000000000060',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'DT-006',
    'Phiên bản hợp nhất giả định',
    '00000000-0000-0000-0000-000000000040',
    '1.1',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    '0.1',
    '{"contractVersion":"1.1","sample":"DT-006"}'::jsonb,
    '3333333333333333333333333333333333333333333333333333333333333333',
    '2026-08-30T08:30:00+07:00',
    '00000000-0000-0000-0000-000000000101'
);

INSERT INTO legal_builder.draft_version_edge (
    version_id, source_version_id, edge_type, source_order
) VALUES (
    '00000000-0000-0000-0000-000000000060',
    '00000000-0000-0000-0000-000000000050',
    'PARENT',
    0
);

INSERT INTO legal_builder.draft_version_basis (
    id, version_id, basis_type_code, source_type_code, source_id,
    role_code, summary, recorded_at, recorded_by_user_id
) VALUES
(
    '00000000-0000-0000-0000-000000000051',
    '00000000-0000-0000-0000-000000000050',
    'REVIEW',
    'MEETING',
    '00000000-0000-0000-0000-000000000301',
    'PRIMARY_BASIS',
    'Căn cứ hoàn toàn giả định cho DT-005.',
    '2026-08-30T08:25:00+07:00',
    '00000000-0000-0000-0000-000000000101'
),
(
    '00000000-0000-0000-0000-000000000061',
    '00000000-0000-0000-0000-000000000060',
    'MERGE',
    'DRAFT_VERSION',
    '00000000-0000-0000-0000-000000000050',
    'PRIMARY_BASIS',
    'Căn cứ hợp nhất hoàn toàn giả định cho DT-006.',
    '2026-08-30T08:30:00+07:00',
    '00000000-0000-0000-0000-000000000101'
);

INSERT INTO legal_builder.legal_node_version_state (
    draft_version_id, legal_node_id, exists_at_version, node_type_code,
    parent_node_id, order_key, display_number, node_snapshot
) VALUES (
    '00000000-0000-0000-0000-000000000060',
    '00000000-0000-0000-0000-000000000030',
    true,
    'ARTICLE',
    NULL,
    '0001',
    'Điều 1',
    '{"id":"00000000-0000-0000-0000-000000000030","nodeTypeCode":"ARTICLE"}'::jsonb
);

INSERT INTO legal_builder.snapshot_asset_ref (
    draft_version_id, project_id, figure_id, legal_node_id, asset_id, asset_version_id,
    media_type, byte_size, checksum_sha256, verification_status_code,
    display_role_code, alternative_text, caption, metadata
) VALUES (
    '00000000-0000-0000-0000-000000000060',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000070',
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000011',
    'image/png',
    1024,
    '0000000000000000000000000000000000000000000000000000000000000000',
    'SAMPLE_NOT_VERIFIED',
    'ILLUSTRATION',
    'Hình minh họa hoàn toàn giả định.',
    '[{"kind":"PARAGRAPH","spans":[{"text":"Hình mẫu"}]}]'::jsonb,
    '{}'::jsonb
);

DO $$
BEGIN
    BEGIN
        UPDATE legal_builder.draft_version
        SET name = 'Không được phép sửa'
        WHERE id = '00000000-0000-0000-0000-000000000060';
        RAISE EXCEPTION 'expected immutable version update to fail';
    EXCEPTION
        WHEN object_not_in_prerequisite_state THEN NULL;
    END;
END;
$$;

SET CONSTRAINTS ALL IMMEDIATE;

DO $$
DECLARE
    version_count integer;
    asset_ref_count integer;
BEGIN
    SELECT count(*) INTO version_count
    FROM legal_builder.draft_version
    WHERE project_id = '00000000-0000-0000-0000-000000000001';

    SELECT count(*) INTO asset_ref_count
    FROM legal_builder.snapshot_asset_ref
    WHERE draft_version_id = '00000000-0000-0000-0000-000000000060';

    IF version_count <> 2 OR asset_ref_count <> 1 THEN
        RAISE EXCEPTION 'fixture assertion failed: versions %, asset refs %', version_count, asset_ref_count;
    END IF;
END;
$$;

ROLLBACK;

BEGIN;

CREATE OR REPLACE FUNCTION legal_builder.project_completed_merge_assets()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status_code <> 'COMPLETED' OR NEW.completed_version_id IS NULL
     OR (OLD.status_code = 'COMPLETED' AND OLD.completed_version_id = NEW.completed_version_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO legal_builder.snapshot_asset_ref(
    draft_version_id,project_id,figure_id,legal_node_id,asset_id,asset_version_id,
    media_type,byte_size,checksum_sha256,verification_status_code,display_role_code,
    alternative_text,caption,source_type_code,source_id,source_version_id,metadata)
  SELECT version.id,version.project_id,(block->>'figureId')::uuid,(node->>'id')::uuid,
         (block->'asset'->>'assetId')::uuid,(block->'asset'->>'assetVersionId')::uuid,
         block->'asset'->>'mediaType',(block->'asset'->>'byteSize')::bigint,
         block->'asset'->'checksum'->>'value',block->>'verificationStatus',block->>'displayRoleCode',
         block->>'alternativeText',block->'caption',block->'source'->>'sourceType',
         NULLIF(block->'source'->>'sourceId','')::uuid,NULLIF(block->'source'->>'sourceVersionId','')::uuid,
         coalesce(block->'metadata','{}'::jsonb)
    FROM legal_builder.draft_version version
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(version.document_snapshot->'nodes','[]'::jsonb)) node
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(node->'content','[]'::jsonb)) block
   WHERE version.id=NEW.completed_version_id
     AND block->>'kind'='FIGURE';
  RETURN NEW;
END $$;

CREATE TRIGGER tr_completed_merge_project_assets
AFTER UPDATE OF status_code,completed_version_id ON legal_builder.draft_merge_operation
FOR EACH ROW EXECUTE FUNCTION legal_builder.project_completed_merge_assets();

COMMIT;

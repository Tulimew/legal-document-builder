-- R20-02 Restore Validation Script
-- Validates schema objects and record counts in restored database

SELECT 
  'TABLES' as object_type, 
  table_schema, 
  count(*) as object_count
FROM information_schema.tables 
WHERE table_schema IN ('public', 'legal_builder')
GROUP BY table_schema

UNION ALL

SELECT 
  'CONSTRAINTS' as object_type, 
  constraint_schema as table_schema, 
  count(*) as object_count
FROM information_schema.table_constraints 
WHERE constraint_schema IN ('public', 'legal_builder')
GROUP BY constraint_schema

UNION ALL

SELECT 
  'TRIGGERS' as object_type, 
  trigger_schema as table_schema, 
  count(*) as object_count
FROM information_schema.triggers 
WHERE trigger_schema IN ('public', 'legal_builder')
GROUP BY trigger_schema

UNION ALL

SELECT 
  'ROUTINES' as object_type, 
  routine_schema as table_schema, 
  count(*) as object_count
FROM information_schema.routines 
WHERE routine_schema IN ('public', 'legal_builder')
GROUP BY routine_schema

ORDER BY object_type, table_schema;

-- Critical table row counts
SELECT 'draft_version' as table_name, count(*) as row_count FROM legal_builder.draft_version
UNION ALL SELECT 'checksum_reconciliation_evidence', count(*) FROM legal_builder.checksum_reconciliation_evidence
UNION ALL SELECT 'checksum_reconciliation_approval', count(*) FROM legal_builder.checksum_reconciliation_approval
UNION ALL SELECT 'legal_builder_schema_migration', count(*) FROM public.legal_builder_schema_migration
UNION ALL SELECT 'amendment_target', count(*) FROM legal_builder.amendment_target
UNION ALL SELECT 'publishing_job', count(*) FROM legal_builder.publishing_job
UNION ALL SELECT 'draft_merge_operation', count(*) FROM legal_builder.draft_merge_operation
ORDER BY table_name;

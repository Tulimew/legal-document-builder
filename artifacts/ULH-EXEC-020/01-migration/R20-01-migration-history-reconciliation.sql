-- R20-01 Migration History Reconciliation Script
-- Examines schema migration state in legal_builder_schema_migration

SELECT 
  name, 
  checksum_sha256, 
  applied_at,
  clock_timestamp() as query_timestamp,
  current_database() as database_name,
  current_user as executed_by_role
FROM public.legal_builder_schema_migration
ORDER BY name ASC;

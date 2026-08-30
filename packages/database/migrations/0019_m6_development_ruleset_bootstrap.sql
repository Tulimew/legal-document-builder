BEGIN;

INSERT INTO legal_builder.legal_structure_rule_set_definition(
  id,code,name,status_code,provenance,created_at)
VALUES(
  '30000000-0000-4000-8000-000000000001',
  'DEVELOPMENT-LEGAL-STRUCTURE',
  'RuleSet cấu trúc văn bản dùng cho development fixture',
  'DEVELOPMENT_ONLY',
  '{"bootstrapMigration":"0019","scope":"DEVELOPMENT_FIXTURE_ONLY","changesSnapshot":false}'::jsonb,
  clock_timestamp())
ON CONFLICT(id) DO NOTHING;

INSERT INTO legal_builder.legal_structure_rule_set_version(
  id,definition_id,version_code,status_code,configuration,provenance,created_at)
VALUES(
  '30000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000001',
  '1.1-user-confirmed',
  'DEVELOPMENT_ONLY',
  '{"schemaVersion":"1","mode":"DEVELOPMENT_ONLY","allowedNodeTypes":["SECTION","CHAPTER","PART","SUBSECTION","ARTICLE","CLAUSE","POINT","OTHER"],"allowedRootTypes":["SECTION","CHAPTER","PART","SUBSECTION","ARTICLE","CLAUSE","POINT","OTHER"],"allowedChildren":{"SECTION":["SECTION","CHAPTER","PART","SUBSECTION","ARTICLE","CLAUSE","POINT","OTHER"],"CHAPTER":["SECTION","SUBSECTION","ARTICLE","OTHER"],"PART":["CHAPTER","SECTION","ARTICLE","OTHER"],"SUBSECTION":["ARTICLE","CLAUSE","OTHER"],"ARTICLE":["CLAUSE","POINT","OTHER"],"CLAUSE":["POINT","OTHER"],"POINT":["OTHER"],"OTHER":["OTHER"]},"managedNumberTypes":["CHAPTER","PART","SUBSECTION","ARTICLE","CLAUSE","POINT"]}'::jsonb,
  '{"bootstrapMigration":"0019","scope":"DEVELOPMENT_FIXTURE_ONLY","legalVerification":"NOT_FOR_PRODUCTION","changesSnapshot":false}'::jsonb,
  clock_timestamp())
ON CONFLICT(id) DO NOTHING;

COMMIT;

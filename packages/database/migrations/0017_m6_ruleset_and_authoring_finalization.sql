BEGIN;

CREATE TABLE legal_builder.legal_structure_rule_set_definition (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  status_code text NOT NULL,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  CONSTRAINT ck_ruleset_definition_status CHECK (status_code IN ('REFERENCE_ONLY','DEVELOPMENT_ONLY','ACTIVE','RETIRED')),
  CONSTRAINT ck_ruleset_definition_provenance CHECK (jsonb_typeof(provenance)='object')
);

CREATE TABLE legal_builder.legal_structure_rule_set_version (
  id uuid PRIMARY KEY,
  definition_id uuid NOT NULL REFERENCES legal_builder.legal_structure_rule_set_definition(id),
  version_code text NOT NULL,
  status_code text NOT NULL,
  configuration jsonb NOT NULL,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  UNIQUE(id,definition_id,version_code),
  UNIQUE(definition_id,version_code),
  CONSTRAINT ck_ruleset_version_status CHECK (status_code IN ('REFERENCE_ONLY','DEVELOPMENT_ONLY','ACTIVE','RETIRED')),
  CONSTRAINT ck_ruleset_configuration_object CHECK (jsonb_typeof(configuration)='object'),
  CONSTRAINT ck_ruleset_version_provenance CHECK (jsonb_typeof(provenance)='object')
);

WITH referenced AS (
  SELECT ruleset_definition_id definition_id FROM legal_builder.draft_workspace
  UNION SELECT ruleset_definition_id FROM legal_builder.draft_version
)
INSERT INTO legal_builder.legal_structure_rule_set_definition(id,code,name,status_code,provenance,created_at)
SELECT definition_id,'BACKFILLED-'||definition_id::text,'RuleSet reference backfilled from immutable drafting history','REFERENCE_ONLY',
       jsonb_build_object('backfillMigration','0017','source','existing workspace/version references','changesSnapshot',false),clock_timestamp()
  FROM referenced
ON CONFLICT(id) DO NOTHING;

WITH referenced AS (
  SELECT ruleset_definition_id definition_id,ruleset_version_id version_id,ruleset_version_code version_code FROM legal_builder.draft_workspace
  UNION SELECT ruleset_definition_id,ruleset_version_id,ruleset_version_code FROM legal_builder.draft_version
)
INSERT INTO legal_builder.legal_structure_rule_set_version(id,definition_id,version_code,status_code,configuration,provenance,created_at)
SELECT version_id,definition_id,version_code,
       CASE WHEN definition_id='30000000-0000-4000-8000-000000000001'::uuid AND version_id='30000000-0000-4000-8000-000000000002'::uuid THEN 'DEVELOPMENT_ONLY' ELSE 'REFERENCE_ONLY' END,
       CASE WHEN definition_id='30000000-0000-4000-8000-000000000001'::uuid AND version_id='30000000-0000-4000-8000-000000000002'::uuid THEN
         '{"schemaVersion":"1","mode":"DEVELOPMENT_ONLY","allowedNodeTypes":["SECTION","CHAPTER","PART","SUBSECTION","ARTICLE","CLAUSE","POINT","OTHER"],"allowedRootTypes":["SECTION","CHAPTER","PART","SUBSECTION","ARTICLE","CLAUSE","POINT","OTHER"],"allowedChildren":{"SECTION":["SECTION","CHAPTER","PART","SUBSECTION","ARTICLE","CLAUSE","POINT","OTHER"],"CHAPTER":["SECTION","SUBSECTION","ARTICLE","OTHER"],"PART":["CHAPTER","SECTION","ARTICLE","OTHER"],"SUBSECTION":["ARTICLE","CLAUSE","OTHER"],"ARTICLE":["CLAUSE","POINT","OTHER"],"CLAUSE":["POINT","OTHER"],"POINT":["OTHER"],"OTHER":["OTHER"]},"managedNumberTypes":["CHAPTER","PART","SUBSECTION","ARTICLE","CLAUSE","POINT"]}'::jsonb
       ELSE '{"schemaVersion":"1","mode":"REFERENCE_ONLY"}'::jsonb END,
       jsonb_build_object('backfillMigration','0017','source','existing workspace/version references','changesSnapshot',false,
         'legalVerification',CASE WHEN definition_id='30000000-0000-4000-8000-000000000001'::uuid THEN 'DEVELOPMENT_FIXTURE_ONLY' ELSE 'NOT_VERIFIED' END),clock_timestamp()
  FROM referenced
ON CONFLICT(id) DO NOTHING;

ALTER TABLE legal_builder.draft_workspace ADD CONSTRAINT fk_workspace_ruleset_exact
  FOREIGN KEY(ruleset_version_id,ruleset_definition_id,ruleset_version_code)
  REFERENCES legal_builder.legal_structure_rule_set_version(id,definition_id,version_code);
ALTER TABLE legal_builder.draft_version ADD CONSTRAINT fk_version_ruleset_exact
  FOREIGN KEY(ruleset_version_id,ruleset_definition_id,ruleset_version_code)
  REFERENCES legal_builder.legal_structure_rule_set_version(id,definition_id,version_code);

INSERT INTO legal_builder.permission_definition(code,name,description,created_at)
VALUES('DRAFT_VERSION_CREATE','Tạo phiên bản dự thảo từ editor','Chốt canonical workspace thành DraftVersion bất biến với provenance',clock_timestamp());

CREATE TABLE legal_builder.authoring_finalization (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
  workspace_id uuid NOT NULL REFERENCES legal_builder.draft_workspace(id),
  source_workspace_revision bigint NOT NULL,
  parent_version_id uuid NOT NULL REFERENCES legal_builder.draft_version(id),
  effective_version_id uuid NOT NULL UNIQUE REFERENCES legal_builder.draft_version(id),
  checkpoint_id uuid NOT NULL UNIQUE REFERENCES legal_builder.draft_checkpoint(id),
  reason text NOT NULL,
  authority_basis text NOT NULL,
  finalized_at timestamptz NOT NULL,
  finalized_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  finalized_by_membership_id uuid NOT NULL REFERENCES legal_builder.project_membership(id),
  CONSTRAINT ck_authoring_finalization_revision CHECK(source_workspace_revision>=0),
  CONSTRAINT ck_authoring_finalization_reason CHECK(btrim(reason)<>''),
  CONSTRAINT ck_authoring_finalization_authority CHECK(btrim(authority_basis)<>'')
);
CREATE INDEX ix_authoring_finalization_workspace ON legal_builder.authoring_finalization(workspace_id,finalized_at DESC);
CREATE TRIGGER tr_ruleset_version_immutable BEFORE UPDATE OR DELETE ON legal_builder.legal_structure_rule_set_version FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();
CREATE TRIGGER tr_authoring_finalization_immutable BEFORE UPDATE OR DELETE ON legal_builder.authoring_finalization FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

COMMIT;

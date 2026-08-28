BEGIN;

CREATE TABLE legal_builder.amendment_layout_configuration(
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
  layout_mode_code text NOT NULL,
  ruleset_version_code text NOT NULL,
  decision_basis text NOT NULL,
  status_code text NOT NULL,
  supersedes_configuration_id uuid REFERENCES legal_builder.amendment_layout_configuration(id),
  created_at timestamptz NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
  CONSTRAINT ck_amendment_layout_mode CHECK(layout_mode_code IN('ARTICLE_PER_DOCUMENT','CHAPTER_PER_DOCUMENT')),
  CONSTRAINT ck_amendment_layout_ruleset CHECK(btrim(ruleset_version_code)<>''),
  CONSTRAINT ck_amendment_layout_basis CHECK(btrim(decision_basis)<>''),
  CONSTRAINT ck_amendment_layout_status CHECK(status_code IN('ACTIVE','SUPERSEDED'))
);

CREATE UNIQUE INDEX uq_amendment_layout_active_project
  ON legal_builder.amendment_layout_configuration(project_id)
  WHERE status_code='ACTIVE';

COMMIT;

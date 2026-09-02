BEGIN;

INSERT INTO legal_builder.system_permission_definition(code,name,description)
VALUES('AI_PROVIDER_MANAGE','Quản lý nhà cung cấp AI','Cấu hình nhà cung cấp, model và bí mật API đã mã hóa')
ON CONFLICT(code) DO NOTHING;

INSERT INTO legal_builder.system_role_permission(role_code,permission_code)
VALUES('SYSTEM_ADMIN','AI_PROVIDER_MANAGE')
ON CONFLICT DO NOTHING;

CREATE TABLE legal_builder.ai_provider_configuration (
    provider_code text PRIMARY KEY,
    model_code text NOT NULL,
    encrypted_api_key text NOT NULL,
    api_key_suffix text NOT NULL,
    encryption_algorithm_code text NOT NULL DEFAULT 'AES_256_GCM_V1',
    enabled boolean NOT NULL DEFAULT false,
    revision bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL,
    updated_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    CONSTRAINT ck_ai_provider_code CHECK(provider_code IN('OPENAI','GEMINI','ANTHROPIC')),
    CONSTRAINT ck_ai_model_not_blank CHECK(btrim(model_code)<>''),
    CONSTRAINT ck_ai_secret_not_blank CHECK(btrim(encrypted_api_key)<>''),
    CONSTRAINT ck_ai_key_suffix CHECK(length(api_key_suffix) BETWEEN 2 AND 8),
    CONSTRAINT ck_ai_encryption_algorithm CHECK(encryption_algorithm_code='AES_256_GCM_V1'),
    CONSTRAINT ck_ai_revision CHECK(revision>=0)
);

COMMIT;

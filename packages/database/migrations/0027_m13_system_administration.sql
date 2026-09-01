BEGIN;

CREATE TABLE legal_builder.system_permission_definition (
    code text PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL,
    CONSTRAINT ck_system_permission_code CHECK (btrim(code) <> '')
);

INSERT INTO legal_builder.system_permission_definition(code,name,description) VALUES
('SYSTEM_CONFIG_READ','Xem cấu hình hệ thống','Đọc cấu hình vận hành không chứa bí mật'),
('SYSTEM_CONFIG_MANAGE','Quản lý cấu hình hệ thống','Thay đổi cấu hình nghiệp vụ toàn hệ thống'),
('USER_ACCOUNT_READ','Xem tài khoản','Xem danh sách và trạng thái tài khoản'),
('USER_ACCOUNT_MANAGE','Quản lý tài khoản','Tạo, khóa, mở khóa tài khoản cục bộ'),
('SYSTEM_ROLE_MANAGE','Quản lý quyền hệ thống','Gán và thu hồi vai trò quản trị hệ thống'),
('PROJECT_CREATE','Tạo hồ sơ','Khởi tạo hồ sơ xây dựng văn bản mới');

CREATE TABLE legal_builder.system_role_definition (
    code text PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL,
    status_code text NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT ck_system_role_status CHECK (status_code IN ('ACTIVE','RETIRED'))
);

INSERT INTO legal_builder.system_role_definition(code,name,description) VALUES
('SYSTEM_ADMIN','Quản trị hệ thống','Toàn quyền cấu hình, tài khoản và tạo hồ sơ'),
('ACCOUNT_ADMIN','Quản trị tài khoản','Quản lý tài khoản và xem cấu hình'),
('PROJECT_CREATOR','Người khởi tạo hồ sơ','Được tạo hồ sơ xây dựng văn bản mới');

CREATE TABLE legal_builder.system_role_permission (
    role_code text NOT NULL REFERENCES legal_builder.system_role_definition(code),
    permission_code text NOT NULL REFERENCES legal_builder.system_permission_definition(code),
    PRIMARY KEY(role_code,permission_code)
);

INSERT INTO legal_builder.system_role_permission(role_code,permission_code)
SELECT 'SYSTEM_ADMIN',code FROM legal_builder.system_permission_definition;
INSERT INTO legal_builder.system_role_permission(role_code,permission_code) VALUES
('ACCOUNT_ADMIN','SYSTEM_CONFIG_READ'),('ACCOUNT_ADMIN','USER_ACCOUNT_READ'),
('ACCOUNT_ADMIN','USER_ACCOUNT_MANAGE'),('PROJECT_CREATOR','PROJECT_CREATE');

CREATE TABLE legal_builder.user_system_role_assignment (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    role_code text NOT NULL REFERENCES legal_builder.system_role_definition(code),
    assigned_at timestamptz NOT NULL,
    assigned_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    revoked_at timestamptz,
    revoked_by_user_id uuid REFERENCES legal_builder.user_account(id),
    revocation_reason text,
    CONSTRAINT ck_system_role_revocation CHECK (
      (revoked_at IS NULL AND revoked_by_user_id IS NULL AND revocation_reason IS NULL)
      OR (revoked_at IS NOT NULL AND revoked_by_user_id IS NOT NULL AND btrim(coalesce(revocation_reason,'')) <> '')
    )
);
CREATE UNIQUE INDEX uq_active_user_system_role ON legal_builder.user_system_role_assignment(user_id,role_code) WHERE revoked_at IS NULL;

CREATE TABLE legal_builder.system_setting (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    description text NOT NULL,
    revision bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL,
    updated_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    CONSTRAINT ck_system_setting_key CHECK (btrim(key) <> ''),
    CONSTRAINT ck_system_setting_revision CHECK (revision >= 0)
);

CREATE TABLE legal_builder.system_audit_event (
    id uuid PRIMARY KEY,
    event_type_code text NOT NULL,
    aggregate_type_code text NOT NULL,
    aggregate_id text NOT NULL,
    actor_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    correlation_id text NOT NULL,
    occurred_at timestamptz NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT ck_system_audit_metadata CHECK (jsonb_typeof(metadata)='object')
);
CREATE INDEX ix_system_audit_occurred ON legal_builder.system_audit_event(occurred_at DESC);
CREATE TRIGGER tr_system_audit_immutable BEFORE UPDATE OR DELETE ON legal_builder.system_audit_event
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

CREATE TABLE legal_builder.legal_document_type_definition (
    code text PRIMARY KEY,
    name text NOT NULL,
    status_code text NOT NULL DEFAULT 'ACTIVE',
    sort_order integer NOT NULL,
    configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT ck_document_type_status CHECK (status_code IN ('ACTIVE','RETIRED')),
    CONSTRAINT ck_document_type_order CHECK (sort_order > 0),
    CONSTRAINT ck_document_type_config CHECK (jsonb_typeof(configuration)='object')
);
INSERT INTO legal_builder.legal_document_type_definition(code,name,sort_order,configuration) VALUES
('DECREE','Nghị định',10,'{"legalVerification":"CONFIGURATION_REQUIRED"}'::jsonb),
('CIRCULAR','Thông tư',20,'{"legalVerification":"CONFIGURATION_REQUIRED"}'::jsonb);

CREATE TABLE legal_builder.project_creation_profile (
    project_id uuid PRIMARY KEY REFERENCES legal_builder.legal_document_project(id),
    creation_mode_code text NOT NULL,
    target_document_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL,
    created_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    CONSTRAINT ck_creation_mode CHECK (creation_mode_code IN ('NEW_DOCUMENT','AMEND_DOCUMENTS')),
    CONSTRAINT ck_creation_target_count CHECK (
      (creation_mode_code='NEW_DOCUMENT' AND target_document_count=0)
      OR (creation_mode_code='AMEND_DOCUMENTS' AND target_document_count>=1)
    )
);

COMMIT;

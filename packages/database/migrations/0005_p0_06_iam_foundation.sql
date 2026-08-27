BEGIN;

CREATE TABLE legal_builder.person (
    id uuid PRIMARY KEY,
    display_name text NOT NULL,
    status_code text NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL,
    CONSTRAINT ck_person_name_not_blank CHECK (btrim(display_name) <> ''),
    CONSTRAINT ck_person_status CHECK (status_code IN ('ACTIVE','INACTIVE'))
);

CREATE TABLE legal_builder.organization (
    id uuid PRIMARY KEY,
    parent_organization_id uuid REFERENCES legal_builder.organization(id),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    status_code text NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL,
    CONSTRAINT ck_organization_code_not_blank CHECK (btrim(code) <> ''),
    CONSTRAINT ck_organization_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT ck_organization_status CHECK (status_code IN ('ACTIVE','INACTIVE')),
    CONSTRAINT ck_organization_not_self_parent CHECK (parent_organization_id IS NULL OR parent_organization_id <> id)
);

CREATE TABLE legal_builder.user_account (
    id uuid PRIMARY KEY,
    person_id uuid REFERENCES legal_builder.person(id),
    external_provider_code text NOT NULL,
    external_subject text NOT NULL,
    status_code text NOT NULL DEFAULT 'ACTIVE',
    last_authenticated_at timestamptz,
    created_at timestamptz NOT NULL,
    CONSTRAINT uq_user_external_identity UNIQUE (external_provider_code, external_subject),
    CONSTRAINT ck_user_provider_not_blank CHECK (btrim(external_provider_code) <> ''),
    CONSTRAINT ck_user_subject_not_blank CHECK (btrim(external_subject) <> ''),
    CONSTRAINT ck_user_status CHECK (status_code IN ('ACTIVE','LOCKED','DISABLED'))
);

CREATE TABLE legal_builder.permission_definition (
    code text PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL,
    created_at timestamptz NOT NULL,
    CONSTRAINT ck_permission_code_not_blank CHECK (btrim(code) <> '')
);

CREATE TABLE legal_builder.role_definition (
    id uuid PRIMARY KEY,
    code text NOT NULL,
    version_code text NOT NULL,
    name text NOT NULL,
    status_code text NOT NULL,
    effective_from timestamptz NOT NULL,
    effective_until timestamptz,
    created_at timestamptz NOT NULL,
    created_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    CONSTRAINT uq_role_code_version UNIQUE (code, version_code),
    CONSTRAINT ck_role_status CHECK (status_code IN ('DRAFT','ACTIVE','RETIRED')),
    CONSTRAINT ck_role_effective_time CHECK (effective_until IS NULL OR effective_until > effective_from)
);

CREATE TABLE legal_builder.role_permission (
    role_definition_id uuid NOT NULL REFERENCES legal_builder.role_definition(id),
    permission_code text NOT NULL REFERENCES legal_builder.permission_definition(code),
    PRIMARY KEY (role_definition_id, permission_code)
);

CREATE TABLE legal_builder.project_membership (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
    user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    person_id uuid REFERENCES legal_builder.person(id),
    organization_id uuid REFERENCES legal_builder.organization(id),
    status_code text NOT NULL,
    valid_from timestamptz NOT NULL,
    valid_until timestamptz,
    created_at timestamptz NOT NULL,
    created_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    CONSTRAINT uq_membership_id_project UNIQUE (id, project_id),
    CONSTRAINT ck_membership_status CHECK (status_code IN ('ACTIVE','SUSPENDED','ENDED')),
    CONSTRAINT ck_membership_valid_time CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE UNIQUE INDEX uq_active_membership_user_project
    ON legal_builder.project_membership(project_id, user_id)
    WHERE status_code = 'ACTIVE';

CREATE TABLE legal_builder.membership_role (
    membership_id uuid NOT NULL REFERENCES legal_builder.project_membership(id),
    role_definition_id uuid NOT NULL REFERENCES legal_builder.role_definition(id),
    assigned_at timestamptz NOT NULL,
    assigned_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    PRIMARY KEY (membership_id, role_definition_id)
);

CREATE TABLE legal_builder.delegation (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES legal_builder.legal_document_project(id),
    from_membership_id uuid NOT NULL,
    to_membership_id uuid NOT NULL,
    status_code text NOT NULL,
    reason text NOT NULL,
    valid_from timestamptz NOT NULL,
    valid_until timestamptz NOT NULL,
    created_at timestamptz NOT NULL,
    created_by_user_id uuid NOT NULL REFERENCES legal_builder.user_account(id),
    revoked_at timestamptz,
    revoked_by_user_id uuid REFERENCES legal_builder.user_account(id),
    CONSTRAINT fk_delegation_from_project FOREIGN KEY (from_membership_id, project_id)
        REFERENCES legal_builder.project_membership(id, project_id),
    CONSTRAINT fk_delegation_to_project FOREIGN KEY (to_membership_id, project_id)
        REFERENCES legal_builder.project_membership(id, project_id),
    CONSTRAINT ck_delegation_status CHECK (status_code IN ('ACTIVE','REVOKED','EXPIRED')),
    CONSTRAINT ck_delegation_members CHECK (from_membership_id <> to_membership_id),
    CONSTRAINT ck_delegation_reason_not_blank CHECK (btrim(reason) <> ''),
    CONSTRAINT ck_delegation_valid_time CHECK (valid_until > valid_from),
    CONSTRAINT ck_delegation_revocation CHECK (
        (status_code = 'REVOKED' AND revoked_at IS NOT NULL AND revoked_by_user_id IS NOT NULL)
        OR (status_code <> 'REVOKED' AND revoked_at IS NULL AND revoked_by_user_id IS NULL)
    )
);

CREATE TABLE legal_builder.delegation_permission (
    delegation_id uuid NOT NULL REFERENCES legal_builder.delegation(id),
    permission_code text NOT NULL REFERENCES legal_builder.permission_definition(code),
    PRIMARY KEY (delegation_id, permission_code)
);

INSERT INTO legal_builder.permission_definition(code,name,description,created_at) VALUES
('WORKSPACE_READ','Đọc workspace','Xem nội dung dự thảo đang làm việc',clock_timestamp()),
('WORKSPACE_EDIT','Sửa workspace','Cập nhật nội dung dự thảo đang làm việc',clock_timestamp()),
('COMMENT_READ','Đọc ý kiến','Xem danh mục và kết quả xử lý ý kiến',clock_timestamp()),
('COMMENT_CREATE','Nhập ý kiến','Ghi nhận ý kiến góp ý',clock_timestamp()),
('COMMENT_RESOLVE','Xử lý ý kiến','Chốt tiếp thu một phần/toàn bộ hoặc giải trình',clock_timestamp());

CREATE INDEX ix_membership_user_project ON legal_builder.project_membership(user_id, project_id);
CREATE INDEX ix_delegation_to_valid ON legal_builder.delegation(to_membership_id, valid_from, valid_until);

CREATE TRIGGER tr_role_definition_immutable BEFORE UPDATE OR DELETE ON legal_builder.role_definition
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();
CREATE TRIGGER tr_role_permission_immutable BEFORE UPDATE OR DELETE ON legal_builder.role_permission
FOR EACH ROW EXECUTE FUNCTION legal_builder.reject_immutable_change();

COMMIT;

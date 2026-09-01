BEGIN;

CREATE TABLE legal_builder.local_account_credential (
    user_account_id uuid PRIMARY KEY REFERENCES legal_builder.user_account(id),
    password_salt text NOT NULL,
    password_hash text NOT NULL,
    password_algorithm text NOT NULL DEFAULT 'SCRYPT_V1',
    failed_attempt_count integer NOT NULL DEFAULT 0,
    locked_until timestamptz,
    password_changed_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL,
    CONSTRAINT ck_local_credential_algorithm CHECK (password_algorithm = 'SCRYPT_V1'),
    CONSTRAINT ck_local_credential_salt CHECK (btrim(password_salt) <> ''),
    CONSTRAINT ck_local_credential_hash CHECK (btrim(password_hash) <> ''),
    CONSTRAINT ck_local_credential_failed_attempts CHECK (failed_attempt_count >= 0)
);

COMMIT;

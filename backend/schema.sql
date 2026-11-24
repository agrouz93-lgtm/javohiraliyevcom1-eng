CREATE TABLE IF NOT EXISTS users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email text UNIQUE NOT NULL,
    salt text NOT NULL,
    password_hash text NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token text PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires);
CREATE TABLE IF NOT EXISTS projects (
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id uuid NOT NULL,
    data jsonb NOT NULL,
    updated timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(user_id,id)
);
CREATE TABLE IF NOT EXISTS password_resets (
    token text PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created timestamptz NOT NULL DEFAULT now(),
    expires timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS password_resets_user ON password_resets(user_id);
-- Additive migration. Apply to existing installations as well as new databases.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN salt DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_subject text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_subject ON users(google_subject);
CREATE UNIQUE INDEX IF NOT EXISTS users_phone ON users(phone);
CREATE TABLE IF NOT EXISTS oauth_states (
    state text PRIMARY KEY,
    nonce text NOT NULL,
    verifier text NOT NULL,
    expires timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS request_limits (
    key text PRIMARY KEY,
    hits integer NOT NULL,
    expires timestamptz NOT NULL
);

ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS mobile_challenge text;
CREATE TABLE IF NOT EXISTS mobile_signins (
    code text PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge text NOT NULL,
    expires timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS furniture_catalog (
    id text PRIMARY KEY,
    data jsonb NOT NULL,
    active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS furniture_versions (
    id text NOT NULL,
    version integer NOT NULL,
    data jsonb NOT NULL,
    PRIMARY KEY(id,version)
);
CREATE TABLE IF NOT EXISTS furniture_audit (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id),
    product_id text NOT NULL,
    action text NOT NULL,
    created timestamptz NOT NULL DEFAULT now()
);

-- Foydalanuvchi balansi va pul yechish (payout) tizimi. Summa so'mda butun son sifatida saqlanadi.
CREATE TABLE IF NOT EXISTS balances (
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    amount bigint NOT NULL DEFAULT 0,
    updated timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS transactions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('wage','payout','deposit','commission')),
    amount bigint NOT NULL,
    reference text NOT NULL DEFAULT '',
    created timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_created ON transactions(created DESC);

CREATE TABLE IF NOT EXISTS payout_requests (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount bigint NOT NULL,
    method text NOT NULL,
    details text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
    created timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    processed_by bigint REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS payout_requests_user ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS payout_requests_status ON payout_requests(status);

CREATE TABLE IF NOT EXISTS wages (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount bigint NOT NULL,
    reference text NOT NULL DEFAULT '',
    created timestamptz NOT NULL DEFAULT now(),
    processed_by bigint REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS wages_user ON wages(user_id);

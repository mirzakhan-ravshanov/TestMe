CREATE TABLE tm_users (
  id text PRIMARY KEY,
  identity_id text UNIQUE,
  telegram_id text UNIQUE,
  name text NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','admin')),
  pro_until timestamptz,
  blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tm_telegram_challenges (
  token_hash text PRIMARY KEY,
  browser_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  telegram_id text,
  telegram_name text,
  confirmation_code text NOT NULL,
  confirmed_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tm_telegram_challenges_expiry ON tm_telegram_challenges(expires_at);
CREATE TABLE tm_sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES tm_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tm_sessions_expiry ON tm_sessions(expires_at);

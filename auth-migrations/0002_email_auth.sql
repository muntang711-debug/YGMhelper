ALTER TABLE members ADD COLUMN email TEXT;
ALTER TABLE members ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0 CHECK(email_verified IN (0,1));
CREATE UNIQUE INDEX IF NOT EXISTS members_email ON members(email);
CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('verify','reset')),
  expires_at INTEGER NOT NULL,
  issued_at INTEGER NOT NULL,
  UNIQUE(member_id,kind)
);
CREATE INDEX IF NOT EXISTS auth_tokens_expiry ON auth_tokens(expires_at);

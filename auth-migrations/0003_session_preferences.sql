ALTER TABLE member_sessions ADD COLUMN persistent INTEGER NOT NULL DEFAULT 0 CHECK(persistent IN (0,1));
ALTER TABLE auth_tokens ADD COLUMN browser_hash TEXT;

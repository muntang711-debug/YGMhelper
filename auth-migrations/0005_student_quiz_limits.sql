ALTER TABLE members ADD COLUMN student_quiz_attempts INTEGER NOT NULL DEFAULT 0 CHECK(student_quiz_attempts BETWEEN 0 AND 5);
CREATE TABLE IF NOT EXISTS student_quiz_ip_blocks (
  ip_hash TEXT PRIMARY KEY,
  blocked_at INTEGER NOT NULL
);

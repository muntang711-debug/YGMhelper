-- Idempotent baseline: also safe for the existing production schema.
CREATE TABLE IF NOT EXISTS meal_ratings (
  date TEXT NOT NULL,
  voter_key TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (date, voter_key)
);
CREATE INDEX IF NOT EXISTS idx_meal_ratings_date ON meal_ratings(date);

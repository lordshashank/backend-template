-- Example: demo table for sample CRUD routes (src/app/routes/messages.ts) — safe to remove
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure melegy_history table exists with all required columns
CREATE TABLE IF NOT EXISTS melegy_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_ip     text,
  chat_title  text,
  chat_date   text,
  messages    jsonb,
  created_at  timestamptz DEFAULT now()
);

-- Add any missing columns to existing table (safe to run multiple times)
ALTER TABLE melegy_history ADD COLUMN IF NOT EXISTS id         uuid DEFAULT gen_random_uuid();
ALTER TABLE melegy_history ADD COLUMN IF NOT EXISTS user_ip    text;
ALTER TABLE melegy_history ADD COLUMN IF NOT EXISTS chat_title text;
ALTER TABLE melegy_history ADD COLUMN IF NOT EXISTS chat_date  text;
ALTER TABLE melegy_history ADD COLUMN IF NOT EXISTS messages   jsonb;
ALTER TABLE melegy_history ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Index for fast lookup by user_ip
CREATE INDEX IF NOT EXISTS idx_melegy_history_user_ip ON melegy_history (user_ip);

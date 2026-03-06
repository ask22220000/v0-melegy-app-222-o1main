-- Add mlg_user_id column to melegy_history table
ALTER TABLE melegy_history ADD COLUMN IF NOT EXISTS mlg_user_id TEXT;
ALTER TABLE melegy_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Index for fast lookups by user ID
CREATE INDEX IF NOT EXISTS idx_melegy_history_mlg_user_id ON melegy_history(mlg_user_id);

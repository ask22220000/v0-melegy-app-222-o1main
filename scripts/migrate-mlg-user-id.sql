-- Migration: add mlg_user_id to melegy_history and back-fill from user_ip
-- Safe to run multiple times (IF NOT EXISTS / IF NOT NULL guards)

-- 1. Add mlg_user_id column
ALTER TABLE melegy_history ADD COLUMN IF NOT EXISTS mlg_user_id TEXT;

-- 2. Add updated_at column
ALTER TABLE melegy_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_melegy_history_mlg_user_id ON melegy_history(mlg_user_id);

-- 4. Back-fill: rows saved before this migration have user_ip instead of mlg_user_id
UPDATE melegy_history
SET mlg_user_id = user_ip
WHERE mlg_user_id IS NULL AND user_ip IS NOT NULL;

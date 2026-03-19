-- Fix conversations table: add mlg_user_id column if missing
-- and ensure melegy_history has auth_user_id column

-- Add mlg_user_id to conversations table (mirrors auth_user_id concept)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'mlg_user_id'
    ) THEN
      ALTER TABLE public.conversations ADD COLUMN mlg_user_id TEXT;
      CREATE INDEX IF NOT EXISTS idx_conversations_mlg_user_id ON public.conversations(mlg_user_id);
    END IF;

    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE public.conversations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
  END IF;
END $$;

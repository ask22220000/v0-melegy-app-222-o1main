-- Fix melegy_history: add auth_user_id to link chats to Supabase Auth users
ALTER TABLE public.melegy_history
  ADD COLUMN IF NOT EXISTS auth_user_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();

-- Index for fast per-user chat lookups
CREATE INDEX IF NOT EXISTS idx_melegy_history_auth_user_id
  ON public.melegy_history(auth_user_id);

-- Fix conversations table: add missing columns used by the API
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'محادثة جديدة',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;

CREATE INDEX IF NOT EXISTS idx_conversations_auth_user_id
  ON public.conversations(auth_user_id);

-- Fix messages table: ensure conversation_id links correctly
-- The messages table uses conversation_id (uuid) which is correct
-- No changes needed there.

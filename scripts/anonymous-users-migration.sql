-- Anonymous Users System Migration
-- Adds user_id (mlg_ prefixed) to users table and creates chat history tables

-- 1. Add mlg_user_id column to existing users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS mlg_user_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS messages_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create index for fast lookups by mlg_user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mlg_user_id ON users(mlg_user_id);

-- 3. Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mlg_user_id TEXT NOT NULL REFERENCES users(mlg_user_id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'محادثة جديدة',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_mlg_user_id ON conversations(mlg_user_id);

-- 4. Create messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  mlg_user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_mlg_user_id ON chat_messages(mlg_user_id);

-- 5. Plan limits table (controls message limits per plan)
CREATE TABLE IF NOT EXISTS plan_limits (
  plan TEXT PRIMARY KEY,
  daily_messages INTEGER NOT NULL,
  label TEXT NOT NULL
);

INSERT INTO plan_limits (plan, daily_messages, label) VALUES
  ('free',    10,   'مجاني'),
  ('startup', 100,  'ستارتر'),
  ('pro',     500,  'برو'),
  ('vip',     99999,'VIP')
ON CONFLICT (plan) DO NOTHING;

-- 6. Row Level Security (RLS) - backend only via service role, so disable RLS
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

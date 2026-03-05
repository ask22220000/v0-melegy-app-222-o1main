-- Add mlg_user_id column to conversations table if it doesn't exist
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS mlg_user_id TEXT;

-- Add mlg_user_id column to chat_messages table if it doesn't exist
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS mlg_user_id TEXT;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_conversations_mlg_user_id ON conversations(mlg_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_mlg_user_id ON chat_messages(mlg_user_id);

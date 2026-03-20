-- Create melegy_users table with authentication
CREATE TABLE IF NOT EXISTS melegy_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  plan VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS melegy_users_email_idx ON melegy_users(email);

-- Alter melegy_history table to link with users
ALTER TABLE melegy_history 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES melegy_users(id) ON DELETE CASCADE,
DROP COLUMN IF EXISTS mlg_user_id;

-- Create index on user_id for melegy_history
CREATE INDEX IF NOT EXISTS melegy_history_user_id_idx ON melegy_history(user_id);

-- Alter user_usage table to link with users
ALTER TABLE user_usage 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES melegy_users(id) ON DELETE CASCADE,
DROP COLUMN IF EXISTS mlg_user_id;

-- Create index on user_id for user_usage
CREATE INDEX IF NOT EXISTS user_usage_user_id_idx ON user_usage(user_id);

-- Enable Row Level Security on melegy_users
ALTER TABLE melegy_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for melegy_users
CREATE POLICY "Users can read own data" ON melegy_users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON melegy_users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Enable RLS on melegy_history
ALTER TABLE melegy_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for melegy_history
DROP POLICY IF EXISTS "Users can read own history" ON melegy_history;
CREATE POLICY "Users can read own history" ON melegy_history
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own history" ON melegy_history;
CREATE POLICY "Users can insert own history" ON melegy_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own history" ON melegy_history;
CREATE POLICY "Users can update own history" ON melegy_history
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own history" ON melegy_history;
CREATE POLICY "Users can delete own history" ON melegy_history
  FOR DELETE USING (user_id = auth.uid());

-- Enable RLS on user_usage
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_usage
DROP POLICY IF EXISTS "Users can read own usage" ON user_usage;
CREATE POLICY "Users can read own usage" ON user_usage
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own usage" ON user_usage;
CREATE POLICY "Users can insert own usage" ON user_usage
  FOR INSERT WITH CHECK (user_id = auth.uid());

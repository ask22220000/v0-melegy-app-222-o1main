-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  user_ip TEXT,
  device_info TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW(),
  total_messages INT DEFAULT 0,
  total_conversations INT DEFAULT 0
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  plan_name TEXT NOT NULL DEFAULT 'free', -- 'free', 'starter', 'pro', 'advanced'
  status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create active_sessions table for real-time active users
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  session_id TEXT NOT NULL,
  user_ip TEXT,
  last_ping_at TIMESTAMP DEFAULT NOW(),
  page_path TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);
CREATE INDEX IF NOT EXISTS idx_sessions_last_ping ON active_sessions(last_ping_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_name);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

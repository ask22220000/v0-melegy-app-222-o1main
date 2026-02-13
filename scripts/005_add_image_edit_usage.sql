-- Image Edit Usage Tracking System
-- Tracks how many times each user has used the image edit feature

-- Table to track image edit usage per user per plan
CREATE TABLE IF NOT EXISTS image_edit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'free', -- 'free', 'starter', 'pro', 'advanced'
  usage_count INTEGER NOT NULL DEFAULT 0,
  month_year TEXT NOT NULL, -- Format: '2024-01' for monthly reset
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(visitor_id, plan_type, month_year)
);

-- Table to track purchased tokens
CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  tokens_purchased INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  tokens_remaining INTEGER GENERATED ALWAYS AS (tokens_purchased - tokens_used) STORED,
  purchase_date TIMESTAMP DEFAULT NOW(),
  paypal_transaction_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_image_edit_usage_visitor ON image_edit_usage(visitor_id);
CREATE INDEX IF NOT EXISTS idx_image_edit_usage_month ON image_edit_usage(month_year);
CREATE INDEX IF NOT EXISTS idx_user_tokens_visitor ON user_tokens(visitor_id);

-- Enable RLS
ALTER TABLE image_edit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

-- Allow all operations (since we're using visitor_id, not auth)
CREATE POLICY "Allow all on image_edit_usage" ON image_edit_usage FOR ALL USING (true);
CREATE POLICY "Allow all on user_tokens" ON user_tokens FOR ALL USING (true);

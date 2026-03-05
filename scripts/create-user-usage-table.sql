-- User usage table: stores daily/monthly counters and preferences per user IP
-- Safe to run multiple times (idempotent)

CREATE TABLE IF NOT EXISTS user_usage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_ip       text NOT NULL,
  usage_date    date NOT NULL DEFAULT CURRENT_DATE,  -- daily reset key
  usage_month   text NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'), -- monthly reset key
  messages      integer NOT NULL DEFAULT 0,
  images        integer NOT NULL DEFAULT 0,
  animated_videos integer NOT NULL DEFAULT 0,
  voice_minutes numeric(10,2) NOT NULL DEFAULT 0,
  monthly_words integer NOT NULL DEFAULT 0,
  monthly_images integer NOT NULL DEFAULT 0,
  theme         text NOT NULL DEFAULT 'dark',
  plan          text NOT NULL DEFAULT 'free',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (user_ip, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_user_usage_ip_date ON user_usage (user_ip, usage_date);

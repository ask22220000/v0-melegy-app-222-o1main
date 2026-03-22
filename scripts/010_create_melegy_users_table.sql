-- Create melegy_users table for anonymous user system
CREATE TABLE IF NOT EXISTS public.melegy_users (
  id              BIGSERIAL PRIMARY KEY,
  mlg_user_id     TEXT UNIQUE NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'free',
  messages_used   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_melegy_users_mlg_user_id ON public.melegy_users(mlg_user_id);
CREATE INDEX IF NOT EXISTS idx_melegy_users_plan ON public.melegy_users(plan);

-- Disable RLS — access via service role key from API only
ALTER TABLE public.melegy_users DISABLE ROW LEVEL SECURITY;

-- plan_limits table
CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan            TEXT PRIMARY KEY,
  daily_messages  INTEGER NOT NULL,
  label           TEXT NOT NULL
);

INSERT INTO public.plan_limits (plan, daily_messages, label) VALUES
  ('free',    10,    'مجاني'),
  ('startup', 100,   'ستارتر'),
  ('pro',     500,   'برو'),
  ('vip',     99999, 'VIP')
ON CONFLICT (plan) DO NOTHING;

ALTER TABLE public.plan_limits DISABLE ROW LEVEL SECURITY;

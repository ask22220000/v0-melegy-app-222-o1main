-- Create melegy_users table for anonymous users with plan tracking
create table if not exists melegy_users (
  id uuid primary key default gen_random_uuid(),
  mlg_user_id text unique not null,
  plan text default 'free',
  plan_expires_at timestamp with time zone,
  messages_used integer default 0,
  messages_daily_reset_at timestamp with time zone,
  voice_minutes_used numeric default 0,
  voice_minutes_daily_reset_at timestamp with time zone,
  image_edits_used integer default 0,
  image_edits_daily_reset_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  last_seen_at timestamp with time zone default now(),
  user_agent text,
  ip_address text
);

-- Create melegy_conversations table
create table if not exists melegy_conversations (
  id uuid primary key default gen_random_uuid(),
  mlg_user_id text not null references melegy_users(mlg_user_id) on delete cascade,
  title text,
  messages jsonb not null default '[]',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(mlg_user_id, id)
);

-- Create indexes for performance
create index if not exists idx_melegy_users_id on melegy_users(mlg_user_id);
create index if not exists idx_melegy_users_created_at on melegy_users(created_at);
create index if not exists idx_melegy_conversations_user_id on melegy_conversations(mlg_user_id);
create index if not exists idx_melegy_conversations_created_at on melegy_conversations(created_at);

-- Create plan_limits table
create table if not exists plan_limits (
  id uuid primary key default gen_random_uuid(),
  plan text unique not null,
  label text not null,
  daily_messages integer default 10,
  daily_image_edits integer default 3,
  daily_image_generations integer default 5,
  daily_voice_minutes numeric default 0,
  daily_videos integer default 0,
  created_at timestamp with time zone default now()
);

-- Insert default plan limits
insert into plan_limits (plan, label, daily_messages, daily_image_edits, daily_image_generations, daily_voice_minutes, daily_videos)
values
  ('free', 'المجانية', 10, 3, 3, 30, 3),
  ('startup', 'Start UP', 100, 10, 20, 60, 10),
  ('pro', 'الاحترافية', 500, 50, 100, 300, 50),
  ('vip', 'VIP', 999999, 999999, 999999, 999999, 999999)
on conflict (plan) do update set
  label = excluded.label,
  daily_messages = excluded.daily_messages,
  daily_image_edits = excluded.daily_image_edits,
  daily_image_generations = excluded.daily_image_generations,
  daily_voice_minutes = excluded.daily_voice_minutes,
  daily_videos = excluded.daily_videos;

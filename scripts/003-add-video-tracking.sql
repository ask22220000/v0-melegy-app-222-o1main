-- Add video tracking columns to melegy_users if they don't exist
alter table melegy_users 
add column if not exists videos_used integer default 0,
add column if not exists videos_daily_reset_at timestamp with time zone;

-- Add daily_videos column if it doesn't exist
alter table plan_limits 
add column if not exists daily_videos integer default 0;

-- Update existing plan limits with video limits
update plan_limits set daily_videos = 3 where plan = 'free';
update plan_limits set daily_videos = 10 where plan = 'startup';
update plan_limits set daily_videos = 50 where plan = 'pro';
update plan_limits set daily_videos = 999999 where plan = 'vip';

-- Fix daily_image_generations for free plan (should be 3, not 5)
update plan_limits set daily_image_generations = 3 where plan = 'free';

-- Add auth_user_id column to subscriptions table (links to Supabase Auth)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for fast lookup by auth user
CREATE INDEX IF NOT EXISTS idx_subscriptions_auth_user_id
  ON public.subscriptions(auth_user_id);

-- Optional: Add to user_usage if it exists (safe to skip if table doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_usage') THEN
    ALTER TABLE public.user_usage
      ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_user_usage_auth_user_id
      ON public.user_usage(auth_user_id);
  END IF;
END $$;

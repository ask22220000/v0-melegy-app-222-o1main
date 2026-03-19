-- Ensure melegy_history has all required columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'melegy_history' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.melegy_history ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'melegy_history' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE public.melegy_history ADD COLUMN auth_user_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_melegy_history_auth_user_id ON public.melegy_history(auth_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'melegy_history' AND column_name = 'chat_title'
  ) THEN
    ALTER TABLE public.melegy_history ADD COLUMN chat_title TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'melegy_history' AND column_name = 'chat_date'
  ) THEN
    ALTER TABLE public.melegy_history ADD COLUMN chat_date TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'melegy_history' AND column_name = 'messages'
  ) THEN
    ALTER TABLE public.melegy_history ADD COLUMN messages JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

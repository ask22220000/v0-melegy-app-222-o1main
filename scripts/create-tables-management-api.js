// Uses Supabase Management API to create tables directly
// This guarantees PostgREST schema cache is updated
import { execSync } from "child_process"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("[v0] Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

// Extract project ref from URL: https://xxxx.supabase.co -> xxxx
const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0]
console.log("[v0] Project ref:", projectRef)

const SQL = `
-- melegy_users
CREATE TABLE IF NOT EXISTS public.melegy_users (
  mlg_user_id   TEXT PRIMARY KEY,
  plan          TEXT NOT NULL DEFAULT 'free',
  messages_used INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- plan_limits
CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan           TEXT PRIMARY KEY,
  daily_messages INTEGER NOT NULL DEFAULT 10,
  label          TEXT NOT NULL DEFAULT 'مجاني'
);

INSERT INTO public.plan_limits (plan, daily_messages, label) VALUES
  ('free',    10,    'مجاني'),
  ('startup', 100,   'ستارتر'),
  ('pro',     500,   'برو'),
  ('vip',     99999, 'VIP')
ON CONFLICT (plan) DO NOTHING;

-- conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL REFERENCES public.melegy_users(mlg_user_id) ON DELETE CASCADE,
  title      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS but allow service role full access
ALTER TABLE public.melegy_users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages  ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, recreate clean
DROP POLICY IF EXISTS "service_role_all" ON public.melegy_users;
DROP POLICY IF EXISTS "service_role_all" ON public.plan_limits;
DROP POLICY IF EXISTS "service_role_all" ON public.conversations;
DROP POLICY IF EXISTS "service_role_all" ON public.chat_messages;

-- Allow all operations for service role
CREATE POLICY "service_role_all" ON public.melegy_users  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.plan_limits   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.conversations  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.chat_messages  FOR ALL USING (true) WITH CHECK (true);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
`

async function run() {
  console.log("[v0] Running SQL via Supabase Management API...")

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: SQL }),
    }
  )

  const text = await response.text()
  console.log("[v0] Management API response status:", response.status)
  console.log("[v0] Management API response:", text)

  if (!response.ok) {
    console.log("[v0] Management API failed, trying direct REST query...")
    
    // Fallback: try via Supabase REST with rpc
    const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: SQL }),
    })
    const rpcText = await rpcResponse.text()
    console.log("[v0] RPC response:", rpcText)
  }

  // Verify table is accessible via REST
  console.log("[v0] Verifying melegy_users via REST...")
  const verify = await fetch(`${SUPABASE_URL}/rest/v1/melegy_users?limit=1`, {
    headers: {
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  const verifyText = await verify.text()
  console.log("[v0] Verify status:", verify.status)
  console.log("[v0] Verify response:", verifyText)

  if (verify.status === 200) {
    console.log("[v0] SUCCESS: melegy_users is accessible via Supabase REST!")
  } else {
    console.log("[v0] FAILED: melegy_users not accessible. Error:", verifyText)
  }
}

run().catch(e => {
  console.error("[v0] Fatal:", e.message)
  process.exit(1)
})

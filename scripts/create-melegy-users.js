import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  console.log("Checking melegy_users table...")

  const { error } = await supabase.from("melegy_users").select("mlg_user_id").limit(1)

  if (error && error.code === "42P01") {
    console.log("  [INFO] melegy_users table does not exist. Please run this SQL in Supabase SQL Editor:")
    console.log(`
CREATE TABLE IF NOT EXISTS melegy_users (
  mlg_user_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free',
  messages_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed plan limits if not already done
INSERT INTO plan_limits (plan, daily_messages, label) VALUES
  ('free',    10,    'مجاني'),
  ('startup', 100,   'ستارتر'),
  ('pro',     500,   'برو'),
  ('vip',     99999, 'VIP')
ON CONFLICT (plan) DO NOTHING;
    `)
  } else if (error) {
    console.log("  [WARN] Error:", error.message)
  } else {
    console.log("  [OK] melegy_users table exists and accessible")
  }

  // Check plan_limits
  const { data: plans, error: planErr } = await supabase.from("plan_limits").select("*")
  if (planErr) {
    console.log("  [WARN] plan_limits:", planErr.message)
  } else {
    console.log("  [OK] plan_limits:", plans)
  }

  // Check conversations
  const { error: convErr } = await supabase.from("conversations").select("id").limit(1)
  if (convErr) {
    console.log("  [WARN] conversations:", convErr.message)
  } else {
    console.log("  [OK] conversations table accessible")
  }

  // Check chat_messages
  const { error: msgErr } = await supabase.from("chat_messages").select("id").limit(1)
  if (msgErr) {
    console.log("  [WARN] chat_messages:", msgErr.message)
  } else {
    console.log("  [OK] chat_messages table accessible")
  }
}

run().catch(console.error)

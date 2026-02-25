import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  console.log("Running migration via Supabase...")

  // Helper to run raw SQL via Supabase REST API
  async function sql(query, label) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      method: "HEAD",
    })
    // Use supabase rpc if available, else fall back to insert
    const { data, error } = await supabase.rpc("exec_ddl", { ddl: query }).catch(() => ({ data: null, error: { message: "rpc not available" } }))
    if (error) {
      console.log(`  [WARN] ${label}: ${error.message}`)
    } else {
      console.log(`  [OK] ${label}`)
    }
  }

  // 1. Try to add columns to users - use supabase to check existing and insert test user with mlg_user_id
  // Since we can't run DDL directly via supabase-js without an RPC, let's create the tables
  // by attempting to insert and checking the error

  // Check if conversations table exists
  const { error: convErr } = await supabase.from("conversations").select("id").limit(1)
  if (convErr && convErr.code === "42P01") {
    console.log("  [INFO] conversations table missing - needs DDL migration")
  } else {
    console.log("  [OK] conversations table already exists")
  }

  const { error: msgErr } = await supabase.from("chat_messages").select("id").limit(1)
  if (msgErr && msgErr.code === "42P01") {
    console.log("  [INFO] chat_messages table missing - needs DDL migration")
  } else {
    console.log("  [OK] chat_messages table already exists")
  }

  const { error: planErr } = await supabase.from("plan_limits").select("plan").limit(1)
  if (planErr && planErr.code === "42P01") {
    console.log("  [INFO] plan_limits table missing - needs DDL migration")
  } else {
    console.log("  [OK] plan_limits table already exists")
  }

  // Check users table for mlg_user_id
  const { data: testUser, error: userErr } = await supabase.from("users").select("mlg_user_id").limit(1)
  if (userErr) {
    console.log("  [INFO] mlg_user_id column may be missing:", userErr.message)
  } else {
    console.log("  [OK] mlg_user_id column exists in users")
  }

  console.log("\nSchema check complete. Please run the SQL below manually in Supabase SQL Editor if any tables are missing:\n")
  console.log(`
-- Run this in Supabase SQL Editor:
ALTER TABLE users ADD COLUMN IF NOT EXISTS mlg_user_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS messages_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mlg_user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'محادثة جديدة',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  mlg_user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_limits (
  plan TEXT PRIMARY KEY,
  daily_messages INTEGER NOT NULL,
  label TEXT NOT NULL
);

INSERT INTO plan_limits (plan, daily_messages, label) VALUES
  ('free', 10, 'مجاني'),
  ('startup', 100, 'ستارتر'),
  ('pro', 500, 'برو'),
  ('vip', 99999, 'VIP')
ON CONFLICT (plan) DO NOTHING;
  `)
}

run().catch(console.error)

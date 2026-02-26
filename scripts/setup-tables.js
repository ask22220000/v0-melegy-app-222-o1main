import { createClient } from "@supabase/supabase-js"

// Use service role to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function run() {
  console.log("[v0] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40))
  console.log("[v0] Service key present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Step 1: Try to query melegy_users
  const { data, error } = await supabase
    .from("melegy_users")
    .select("*")
    .limit(1)

  if (error) {
    console.log("[v0] melegy_users query error:", error.message)
    console.log("[v0] Error code:", error.code)
    console.log("[v0] Error details:", error.details)
    console.log("[v0] Error hint:", error.hint)
  } else {
    console.log("[v0] melegy_users exists! rows:", data.length)
    return
  }

  // Step 2: Try to create via rpc exec_sql if available
  console.log("[v0] Trying exec_sql RPC...")
  const { error: rpcError } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS melegy_users (
        mlg_user_id TEXT PRIMARY KEY,
        plan TEXT NOT NULL DEFAULT 'free',
        messages_used INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS plan_limits (
        plan TEXT PRIMARY KEY,
        daily_messages INTEGER NOT NULL,
        label TEXT
      );
      INSERT INTO plan_limits (plan, daily_messages, label) VALUES
        ('free', 10, 'مجاني'), ('startup', 100, 'ستارتر'),
        ('pro', 500, 'برو'), ('vip', 99999, 'VIP')
      ON CONFLICT (plan) DO NOTHING;
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL REFERENCES melegy_users(mlg_user_id) ON DELETE CASCADE,
        title TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user','assistant')),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  })

  if (rpcError) {
    console.log("[v0] exec_sql RPC error:", rpcError.message)
  } else {
    console.log("[v0] Tables created via exec_sql RPC!")
    return
  }

  // Step 3: Try Management API
  console.log("[v0] Trying Management API...")
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1]
  console.log("[v0] Project ref:", projectRef)

  if (!projectRef) {
    console.error("[v0] Could not extract project ref from URL")
    return
  }

  const mgmtRes = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        query: `
          CREATE TABLE IF NOT EXISTS melegy_users (
            mlg_user_id TEXT PRIMARY KEY,
            plan TEXT NOT NULL DEFAULT 'free',
            messages_used INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            last_seen_at TIMESTAMPTZ DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS plan_limits (
            plan TEXT PRIMARY KEY,
            daily_messages INTEGER NOT NULL,
            label TEXT
          );
          INSERT INTO plan_limits (plan, daily_messages, label) VALUES
            ('free', 10, 'مجاني'), ('startup', 100, 'ستارتر'),
            ('pro', 500, 'برو'), ('vip', 99999, 'VIP')
          ON CONFLICT (plan) DO NOTHING;
          CREATE TABLE IF NOT EXISTS conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL REFERENCES melegy_users(mlg_user_id) ON DELETE CASCADE,
            title TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS chat_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK (role IN ('user','assistant')),
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      }),
    }
  )

  const mgmtData = await mgmtRes.text()
  console.log("[v0] Management API status:", mgmtRes.status)
  console.log("[v0] Management API response:", mgmtData)
}

run().catch(console.error)

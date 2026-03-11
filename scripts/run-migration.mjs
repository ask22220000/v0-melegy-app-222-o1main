import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  console.log("Running anonymous users migration...")

  const steps = [
    {
      name: "Add mlg_user_id to users",
      sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS mlg_user_id TEXT UNIQUE`,
    },
    {
      name: "Add plan to users",
      sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'`,
    },
    {
      name: "Add messages_used to users",
      sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS messages_used INTEGER NOT NULL DEFAULT 0`,
    },
    {
      name: "Add last_seen_at to users",
      sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ`,
    },
    {
      name: "Create index on mlg_user_id",
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mlg_user_id ON users(mlg_user_id)`,
    },
    {
      name: "Create conversations table",
      sql: `CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mlg_user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'محادثة جديدة',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    },
    {
      name: "Create index on conversations.mlg_user_id",
      sql: `CREATE INDEX IF NOT EXISTS idx_conversations_mlg_user_id ON conversations(mlg_user_id)`,
    },
    {
      name: "Create chat_messages table",
      sql: `CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL,
        mlg_user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    },
    {
      name: "Create index on chat_messages.conversation_id",
      sql: `CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id)`,
    },
    {
      name: "Create plan_limits table",
      sql: `CREATE TABLE IF NOT EXISTS plan_limits (
        plan TEXT PRIMARY KEY,
        daily_messages INTEGER NOT NULL,
        label TEXT NOT NULL
      )`,
    },
    {
      name: "Insert plan limits",
      sql: `INSERT INTO plan_limits (plan, daily_messages, label) VALUES
        ('free',    10,   'مجاني'),
        ('startup', 100,  'ستارتر'),
        ('pro',     500,  'برو'),
        ('vip',     99999,'VIP')
        ON CONFLICT (plan) DO NOTHING`,
    },
  ]

  for (const step of steps) {
    const { error } = await supabase.rpc("exec_sql", { sql: step.sql }).catch(() => ({ error: null }))
    // Use raw query via REST
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: step.sql }),
    })
    console.log(`  [${res.ok ? "OK" : "WARN"}] ${step.name}`)
  }

  console.log("Migration complete.")
}

runMigration().catch(console.error)

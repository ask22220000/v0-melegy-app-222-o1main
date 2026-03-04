import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function run() {
  console.log("Creating conversations table...")
  const { error: e1 } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mlg_user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'محادثة جديدة',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(mlg_user_id);
    `,
  })
  if (e1) console.log("conversations note:", e1.message)
  else console.log("conversations table OK")

  console.log("Creating chat_messages table...")
  const { error: e2 } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        mlg_user_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id);
    `,
  })
  if (e2) console.log("chat_messages note:", e2.message)
  else console.log("chat_messages table OK")

  // Test insert to verify tables exist
  const { data: testConv, error: testErr } = await supabase
    .from("conversations")
    .select("id")
    .limit(1)

  if (testErr) {
    console.error("conversations table does NOT exist:", testErr.message)
  } else {
    console.log("conversations table verified, rows:", testConv?.length ?? 0)
  }

  const { data: testMsg, error: testErr2 } = await supabase
    .from("chat_messages")
    .select("id")
    .limit(1)

  if (testErr2) {
    console.error("chat_messages table does NOT exist:", testErr2.message)
  } else {
    console.log("chat_messages table verified, rows:", testMsg?.length ?? 0)
  }
}

run()

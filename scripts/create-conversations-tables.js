const { createClient } = require("@supabase/supabase-js")

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing env vars")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function run() {
  // Test conversations table
  const { data: testConv, error: e1 } = await supabase.from("conversations").select("id").limit(1)
  if (e1) {
    console.error("conversations table missing:", e1.message)
  } else {
    console.log("conversations table OK, rows:", testConv?.length ?? 0)
  }

  // Test chat_messages table
  const { data: testMsg, error: e2 } = await supabase.from("chat_messages").select("id").limit(1)
  if (e2) {
    console.error("chat_messages table missing:", e2.message)
  } else {
    console.log("chat_messages table OK, rows:", testMsg?.length ?? 0)
  }
}

run()

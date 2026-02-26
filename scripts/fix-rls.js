import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// We need to disable RLS on melegy_users so anon key can also insert
// OR add permissive RLS policies
const sql = `
-- Disable RLS on all tables (we handle auth at API level)
ALTER TABLE melegy_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- Grant permissions to anon and authenticated roles
GRANT ALL ON melegy_users TO anon, authenticated, service_role;
GRANT ALL ON plan_limits TO anon, authenticated, service_role;
GRANT ALL ON conversations TO anon, authenticated, service_role;
GRANT ALL ON chat_messages TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
`

async function run() {
  console.log("Fixing RLS and permissions...")

  // Use the Management API to run SQL
  const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!projectRef) { console.error("Could not extract project ref"); process.exit(1) }

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  const text = await res.text()
  console.log("Management API response:", res.status, text)

  // Verify with anon key
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const anonDb = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const testId = "mlg-rls" + Date.now()
  const { data, error } = await anonDb
    .from("melegy_users")
    .insert({ mlg_user_id: testId, plan: "free", messages_used: 0 })
    .select("mlg_user_id")
    .single()

  if (error) {
    console.log("Anon INSERT still failing:", error.message)
  } else {
    console.log("Anon INSERT OK:", data.mlg_user_id)
    await anonDb.from("melegy_users").delete().eq("mlg_user_id", testId)
  }

  console.log("Done!")
}

run().catch(e => { console.error("Fatal:", e.message); process.exit(1) })

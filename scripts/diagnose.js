import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log("=== DIAGNOSIS ===")
console.log("SUPABASE_URL:", url ? url : "MISSING")
console.log("SERVICE_ROLE_KEY:", serviceKey ? serviceKey.slice(0,20)+"..." : "MISSING")
console.log("ANON_KEY:", anonKey ? anonKey.slice(0,20)+"..." : "MISSING")

async function testClient(label, key) {
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  })

  console.log(`\n--- Testing with ${label} ---`)
  
  // Test 1: check if table exists
  const { data, error } = await db
    .from("melegy_users")
    .select("mlg_user_id")
    .limit(1)

  if (error) {
    console.log(`[${label}] SELECT error:`, error.message, "| code:", error.code)
  } else {
    console.log(`[${label}] SELECT OK, rows:`, data?.length)
  }

  // Test 2: try insert
  const testId = "mlg-test" + Date.now()
  const { data: ins, error: insErr } = await db
    .from("melegy_users")
    .insert({ mlg_user_id: testId, plan: "free", messages_used: 0 })
    .select("mlg_user_id")
    .single()

  if (insErr) {
    console.log(`[${label}] INSERT error:`, insErr.message, "| code:", insErr.code)
  } else {
    console.log(`[${label}] INSERT OK:`, ins.mlg_user_id)
    // cleanup
    await db.from("melegy_users").delete().eq("mlg_user_id", testId)
  }
}

async function run() {
  if (!url) { console.log("ERROR: NEXT_PUBLIC_SUPABASE_URL is missing!"); process.exit(1) }
  
  if (serviceKey) await testClient("SERVICE_ROLE", serviceKey)
  else console.log("\nSERVICE_ROLE_KEY is MISSING - this is the problem!")
  
  if (anonKey) await testClient("ANON_KEY", anonKey)
  else console.log("\nANON_KEY is MISSING")
}

run().catch(e => { console.error("Fatal:", e.message); process.exit(1) })

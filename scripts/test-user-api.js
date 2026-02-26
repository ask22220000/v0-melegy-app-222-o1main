// Test the exact same logic as /api/user/route.ts
function supabaseHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Prefer": "return=representation",
  }
}

function supabaseUrl(table, query = "") {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${base}/rest/v1/${table}${query ? `?${query}` : ""}`
}

function generateMlgId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let id = "mlg-"
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

async function run() {
  console.log("[v0] Testing exact same logic as /api/user/route.ts")
  console.log("[v0] URL:", process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40))

  const mlgUserId = generateMlgId()
  console.log("[v0] Generated ID:", mlgUserId)

  const insertUrl = supabaseUrl("melegy_users")
  console.log("[v0] INSERT URL:", insertUrl)

  const headers = supabaseHeaders()
  console.log("[v0] Headers (key hidden):", {
    ...headers,
    apikey: headers.apikey?.substring(0, 20) + "...",
    Authorization: "Bearer ..." + headers.Authorization?.slice(-10),
  })

  const now = new Date().toISOString()
  const body = {
    mlg_user_id: mlgUserId,
    plan: "free",
    messages_used: 0,
    created_at: now,
    last_seen_at: now,
  }

  console.log("[v0] Body:", body)

  const res = await fetch(insertUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  console.log("[v0] INSERT status:", res.status)
  const text = await res.text()
  console.log("[v0] INSERT response:", text)

  if (res.ok) {
    console.log("[v0] SUCCESS! User created.")
  } else {
    console.log("[v0] FAILED!")
  }
}

run().catch(console.error)

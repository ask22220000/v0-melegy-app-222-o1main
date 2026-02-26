import { NextRequest, NextResponse } from "next/server"

// Direct Supabase REST API — bypasses all schema cache issues
function supabaseHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    Prefer: "return=representation",
  }
}

function supabaseUrl(table: string, query = "") {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${base}/rest/v1/${table}${query ? `?${query}` : ""}`
}

function generateMlgId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let id = "mlg-"
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

// POST /api/user — create new anonymous user with random ID
export async function POST() {
  try {
    let mlgUserId = generateMlgId()

    // Check uniqueness
    for (let i = 0; i < 5; i++) {
      const check = await fetch(
        supabaseUrl("melegy_users", `mlg_user_id=eq.${mlgUserId}&select=mlg_user_id`),
        { headers: supabaseHeaders() }
      )
      const rows = await check.json()
      if (!rows?.length) break
      mlgUserId = generateMlgId()
    }

    const now = new Date().toISOString()
    const res = await fetch(supabaseUrl("melegy_users"), {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({
        mlg_user_id: mlgUserId,
        plan: "free",
        messages_used: 0,
        created_at: now,
        last_seen_at: now,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: err.message || err.details || JSON.stringify(err) }, { status: 500 })
    }

    const rows = await res.json()
    const user = Array.isArray(rows) ? rows[0] : rows

    return NextResponse.json({ user })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/user?id=mlg-xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mlgUserId = searchParams.get("id")
    if (!mlgUserId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const res = await fetch(
      supabaseUrl(
        "melegy_users",
        `mlg_user_id=eq.${mlgUserId}&select=mlg_user_id,plan,messages_used,created_at,last_seen_at`
      ),
      { headers: supabaseHeaders() }
    )

    const rows = await res.json()
    if (!rows?.length) return NextResponse.json({ error: "User not found" }, { status: 404 })
    const user = rows[0]

    // Get plan limits
    const limitsRes = await fetch(
      supabaseUrl("plan_limits", `plan=eq.${user.plan}&select=daily_messages,label`),
      { headers: supabaseHeaders() }
    )
    const limitsRows = await limitsRes.json()
    const limits = limitsRows?.[0]

    // Update last_seen_at (fire and forget)
    fetch(supabaseUrl("melegy_users", `mlg_user_id=eq.${mlgUserId}`), {
      method: "PATCH",
      headers: supabaseHeaders(),
      body: JSON.stringify({ last_seen_at: new Date().toISOString() }),
    }).catch(() => {})

    return NextResponse.json({
      user: {
        ...user,
        plan_label: limits?.label || user.plan,
        daily_limit: limits?.daily_messages || 10,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

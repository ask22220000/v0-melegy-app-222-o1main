import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Fresh client per request — no singleton, no schema cache issues
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: "public" },
    }
  )
}

function generateMlgId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let id = "mlg-"
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

// POST /api/user — create new anonymous user
export async function POST() {
  try {
    const supabase = db()
    let mlgUserId = generateMlgId()

    // Ensure unique ID
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase
        .from("melegy_users")
        .select("mlg_user_id")
        .eq("mlg_user_id", mlgUserId)
        .maybeSingle()
      if (!data) break
      mlgUserId = generateMlgId()
    }

    const { data, error } = await supabase
      .from("melegy_users")
      .insert({
        mlg_user_id: mlgUserId,
        plan: "free",
        messages_used: 0,
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .select("mlg_user_id, plan, messages_used, created_at")
      .single()

    if (error) {
      console.error("[user/POST] Supabase error:", error.code, error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ user: data })
  } catch (err: any) {
    console.error("[user/POST] unexpected error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/user?id=mlg-xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mlgUserId = searchParams.get("id")
    if (!mlgUserId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const supabase = db()

    const { data: user, error } = await supabase
      .from("melegy_users")
      .select("mlg_user_id, plan, messages_used, created_at, last_seen_at")
      .eq("mlg_user_id", mlgUserId)
      .maybeSingle()

    if (error) {
      console.error("[user/GET] Supabase error:", error.code, error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const { data: limits } = await supabase
      .from("plan_limits")
      .select("daily_messages, label")
      .eq("plan", user.plan)
      .maybeSingle()

    // Update last_seen_at async — don't await
    supabase
      .from("melegy_users")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("mlg_user_id", mlgUserId)

    return NextResponse.json({
      user: {
        ...user,
        plan_label: limits?.label || user.plan,
        daily_limit: limits?.daily_messages || 10,
      },
    })
  } catch (err: any) {
    console.error("[user/GET] unexpected error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

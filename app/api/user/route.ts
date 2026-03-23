import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create a fresh Supabase client per request — no singleton, no cache issues
// Uses service role key if available, falls back to anon key
function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  })
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
    const db = getClient()
    let mlgUserId = generateMlgId()

    // Ensure uniqueness
    for (let i = 0; i < 5; i++) {
      const { data } = await db
        .from("melegy_users")
        .select("mlg_user_id")
        .eq("mlg_user_id", mlgUserId)
        .maybeSingle()
      if (!data) break
      mlgUserId = generateMlgId()
    }

    const { data: user, error } = await db
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
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 500 })
    }

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

    const db = getClient()

    const { data: user, error } = await db
      .from("melegy_users")
      .select("mlg_user_id, plan, messages_used, created_at, last_seen_at")
      .eq("mlg_user_id", mlgUserId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    // Get plan limits
    const { data: limits } = await db
      .from("plan_limits")
      .select("daily_messages, label")
      .eq("plan", user.plan)
      .maybeSingle()

    // Update last_seen_at (fire and forget)
    db.from("melegy_users")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("mlg_user_id", mlgUserId)
      .then(() => {})

    return NextResponse.json({
      user: {
        ...user,
        plan_label: limits?.label || user.plan,
        daily_limit: limits?.daily_messages ?? 10,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

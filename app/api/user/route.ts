import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
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

// POST /api/user — create new anonymous user with random ID
export async function POST() {
  try {
    const db = getDb()

    // Generate unique random ID
    let mlgUserId = generateMlgId()
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await db
        .from("melegy_users")
        .select("mlg_user_id")
        .eq("mlg_user_id", mlgUserId)
        .maybeSingle()
      if (!existing) break
      mlgUserId = generateMlgId()
    }

    const { data, error } = await db
      .from("melegy_users")
      .insert({ mlg_user_id: mlgUserId, plan: "free", messages_used: 0 })
      .select("mlg_user_id, plan, messages_used, created_at")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ user: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/user?id=mlg-xxx — fetch user by mlg_user_id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mlgUserId = searchParams.get("id")
    if (!mlgUserId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const db = getDb()

    const { data: user, error } = await db
      .from("melegy_users")
      .select("mlg_user_id, plan, messages_used, created_at, last_seen_at")
      .eq("mlg_user_id", mlgUserId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const { data: limits } = await db
      .from("plan_limits")
      .select("daily_messages, label")
      .eq("plan", user.plan)
      .maybeSingle()

    await db
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
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

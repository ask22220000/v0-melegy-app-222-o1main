import { NextRequest, NextResponse } from "next/server"
import { getServiceRoleClient } from "@/lib/supabase/server"

function generateMlgId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = "mlg_"
  for (let i = 0; i < 12; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

// POST /api/user — create new anonymous user
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient()

    // Generate unique mlg_user_id
    let mlgUserId = generateMlgId()
    let attempts = 0

    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("melegy_users")
        .select("mlg_user_id")
        .eq("mlg_user_id", mlgUserId)
        .maybeSingle()

      if (!existing) break
      mlgUserId = generateMlgId()
      attempts++
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ user: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/user?id=mlg_xxx — fetch user by mlg_user_id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mlgUserId = searchParams.get("id")

    if (!mlgUserId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    const supabase = getServiceRoleClient()

    const { data: user, error } = await supabase
      .from("melegy_users")
      .select("mlg_user_id, plan, messages_used, created_at, last_seen_at")
      .eq("mlg_user_id", mlgUserId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get plan limits
    const { data: limits } = await supabase
      .from("plan_limits")
      .select("daily_messages, label")
      .eq("plan", user.plan)
      .maybeSingle()

    // Update last_seen_at
    await supabase
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

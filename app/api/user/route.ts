import { NextRequest, NextResponse } from "next/server"
import { getServiceRoleClient } from "@/lib/supabase/server"

// GET /api/user?user_id=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id") || searchParams.get("id")
    if (!userId) return NextResponse.json({ error: "Missing user_id" }, { status: 400 })

    const supabase = getServiceRoleClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_name, status, expires_at")
      .eq("auth_user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const plan = sub?.plan_name ?? "free"

    const { data: conversations } = await supabase
      .from("melegy_conversations")
      .select("id, title, created_at, updated_at")
      .eq("mlg_user_id", userId)
      .order("updated_at", { ascending: false })

    const planLimits: Record<string, number> = {
      free: 10,
      startup: 50,
      pro: 150,
      vip: 500,
    }

    return NextResponse.json({
      user: {
        id: userId,
        plan,
        plan_label: plan,
        daily_limit: planLimits[plan] ?? 10,
        conversations: conversations || [],
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

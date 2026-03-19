import { NextRequest, NextResponse } from "next/server"
import { getServiceRoleClient } from "@/lib/supabase/server"

// GET /api/user — get current auth user info + plan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id") || searchParams.get("id")
    if (!userId) return NextResponse.json({ error: "Missing user_id" }, { status: 400 })

    const supabase = getServiceRoleClient()

    // Try to get subscription/plan info
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_name, status, expires_at")
      .eq("auth_user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const plan = sub?.plan_name ?? "free"

    return NextResponse.json({
      user: {
        id: userId,
        plan,
        plan_label: plan,
        daily_limit: plan === "free" ? 10 : plan === "starter" ? 50 : plan === "pro" ? 150 : 500,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

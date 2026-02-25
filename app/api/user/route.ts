import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use service role client to bypass RLS and schema cache issues
function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "public" }, auth: { persistSession: false } }
  )
}

// Generate sequential mlg ID: mlg-00011121111, mlg-00011121112, ...
function buildMlgId(seq: number): string {
  const base = 11121110
  const num = base + seq
  return `mlg-${num}`
}

// POST /api/user — create new anonymous user with sequential ID
export async function POST() {
  try {
    const db = getDb()

    // Get current count to determine next sequential number
    const { count, error: countErr } = await db
      .from("melegy_users")
      .select("*", { count: "exact", head: true })

    if (countErr) throw new Error(countErr.message)

    const nextSeq = (count ?? 0) + 1
    const mlgUserId = buildMlgId(nextSeq)

    const { data, error } = await db
      .from("melegy_users")
      .insert({
        mlg_user_id: mlgUserId,
        plan: "free",
        messages_used: 0,
      })
      .select("mlg_user_id, plan, messages_used, created_at")
      .single()

    if (error) throw new Error(error.message)

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

    if (!mlgUserId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    const db = getDb()

    const { data: user, error } = await db
      .from("melegy_users")
      .select("mlg_user_id, plan, messages_used, created_at, last_seen_at")
      .eq("mlg_user_id", mlgUserId)
      .maybeSingle()

    if (error) throw new Error(error.message)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get plan limits
    const { data: limits } = await db
      .from("plan_limits")
      .select("daily_messages, label")
      .eq("plan", user.plan)
      .maybeSingle()

    // Update last_seen_at
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

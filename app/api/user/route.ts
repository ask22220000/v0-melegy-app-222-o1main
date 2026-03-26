import { NextRequest, NextResponse } from "next/server"
import { getUserMeta, ensureUserMeta, getEffectivePlan } from "@/lib/db"
import { PLAN_LIMITS } from "@/lib/usage-tracker"

export const runtime = "nodejs"

function generateMlgId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let id = "mlg-"
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

// POST /api/user — create or ensure anonymous user
export async function POST() {
  try {
    const mlgUserId = generateMlgId()
    const meta = await ensureUserMeta(mlgUserId)
    return NextResponse.json({ user: { mlg_user_id: meta.userId, plan: meta.plan, created_at: meta.createdAt } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET /api/user?id=mlg-xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mlgUserId = searchParams.get("id")
    if (!mlgUserId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const meta = await getUserMeta(mlgUserId)
    if (!meta) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const plan = await getEffectivePlan(mlgUserId)
    const limits = PLAN_LIMITS[plan]

    return NextResponse.json({
      user: {
        mlg_user_id: meta.userId,
        plan,
        plan_label: limits.name,
        daily_limit: limits.messagesPerDay,
        created_at: meta.createdAt,
        last_seen_at: meta.updatedAt,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

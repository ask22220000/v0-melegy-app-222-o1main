import { NextRequest, NextResponse } from "next/server"
import { ensureUserMeta, getUserMeta } from "@/lib/db"

export const runtime = "nodejs"

const PLAN_DAILY_LIMITS: Record<string, number> = {
  free: 10,
  startup: 50,
  pro: 200,
  vip: 999,
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
    const mlgUserId = generateMlgId()
    const meta = await ensureUserMeta(mlgUserId)
    return NextResponse.json({
      user: {
        mlg_user_id: meta.userId,
        plan: meta.plan,
        messages_used: 0,
        created_at: meta.createdAt,
        last_seen_at: meta.updatedAt,
        plan_label: meta.plan,
        daily_limit: PLAN_DAILY_LIMITS[meta.plan] ?? 10,
      },
    })
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

    const meta = await getUserMeta(mlgUserId)
    if (!meta) {
      // Auto-create if not found
      const created = await ensureUserMeta(mlgUserId)
      return NextResponse.json({
        user: {
          mlg_user_id: created.userId,
          plan: created.plan,
          messages_used: 0,
          created_at: created.createdAt,
          last_seen_at: created.updatedAt,
          plan_label: created.plan,
          daily_limit: PLAN_DAILY_LIMITS[created.plan] ?? 10,
        },
      })
    }

    return NextResponse.json({
      user: {
        mlg_user_id: meta.userId,
        plan: meta.plan,
        messages_used: 0,
        created_at: meta.createdAt,
        last_seen_at: meta.updatedAt,
        plan_label: meta.plan,
        daily_limit: PLAN_DAILY_LIMITS[meta.plan] ?? 10,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

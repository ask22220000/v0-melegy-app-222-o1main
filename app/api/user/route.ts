import { NextRequest, NextResponse } from "next/server"
import postgres from "postgres"

function getDb() {
  // Use non-pooling URL for direct queries in serverless
  const connString = process.env.POSTGRES_URL_NON_POOLING
    || process.env.POSTGRES_URL
  return postgres(connString!, {
    ssl: "require",
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  })
}

function buildMlgId(seq: number): string {
  return `mlg-${11121110 + seq}`
}

// POST /api/user — create new anonymous user with sequential ID
export async function POST() {
  const sql = getDb()
  try {
    console.log("[v0] POSTGRES_URL_NON_POOLING exists:", !!process.env.POSTGRES_URL_NON_POOLING)
    console.log("[v0] Connecting to DB...")
    const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count FROM melegy_users
    `
    console.log("[v0] melegy_users count:", count)
    const mlgUserId = buildMlgId((count as number) + 1)

    const [user] = await sql`
      INSERT INTO melegy_users (mlg_user_id, plan, messages_used, created_at, last_seen_at)
      VALUES (${mlgUserId}, 'free', 0, NOW(), NOW())
      RETURNING mlg_user_id, plan, messages_used, created_at
    `
    return NextResponse.json({ user })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    await sql.end()
  }
}

// GET /api/user?id=mlg-xxx — fetch user by mlg_user_id
export async function GET(request: NextRequest) {
  const sql = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const mlgUserId = searchParams.get("id")

    if (!mlgUserId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    const [user] = await sql`
      SELECT mlg_user_id, plan, messages_used, created_at, last_seen_at
      FROM melegy_users WHERE mlg_user_id = ${mlgUserId}
    `

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const [limits] = await sql`
      SELECT daily_messages, label FROM plan_limits WHERE plan = ${user.plan}
    `

    await sql`
      UPDATE melegy_users SET last_seen_at = NOW() WHERE mlg_user_id = ${mlgUserId}
    `

    return NextResponse.json({
      user: {
        ...user,
        plan_label: limits?.label || user.plan,
        daily_limit: limits?.daily_messages || 10,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    await sql.end()
  }
}

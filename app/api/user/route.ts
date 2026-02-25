import { NextRequest, NextResponse } from "next/server"
import pg from "pg"

const { Client } = pg

async function getClient() {
  const connString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
  const client = new Client({
    connectionString: connString,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  return client
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
  const client = await getClient()
  try {
    // Generate unique random ID
    let mlgUserId = generateMlgId()
    for (let i = 0; i < 5; i++) {
      const { rows } = await client.query(
        "SELECT 1 FROM melegy_users WHERE mlg_user_id = $1",
        [mlgUserId]
      )
      if (rows.length === 0) break
      mlgUserId = generateMlgId()
    }

    const { rows } = await client.query(
      `INSERT INTO melegy_users (mlg_user_id, plan, messages_used, created_at, last_seen_at)
       VALUES ($1, 'free', 0, NOW(), NOW())
       RETURNING mlg_user_id, plan, messages_used, created_at`,
      [mlgUserId]
    )

    return NextResponse.json({ user: rows[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    await client.end()
  }
}

// GET /api/user?id=mlg-xxx — fetch user
export async function GET(request: NextRequest) {
  const client = await getClient()
  try {
    const { searchParams } = new URL(request.url)
    const mlgUserId = searchParams.get("id")
    if (!mlgUserId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { rows } = await client.query(
      `SELECT mlg_user_id, plan, messages_used, created_at, last_seen_at
       FROM melegy_users WHERE mlg_user_id = $1`,
      [mlgUserId]
    )

    if (rows.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const user = rows[0]

    const { rows: limits } = await client.query(
      "SELECT daily_messages, label FROM plan_limits WHERE plan = $1",
      [user.plan]
    )

    await client.query(
      "UPDATE melegy_users SET last_seen_at = NOW() WHERE mlg_user_id = $1",
      [mlgUserId]
    )

    return NextResponse.json({
      user: {
        ...user,
        plan_label: limits[0]?.label || user.plan,
        daily_limit: limits[0]?.daily_messages || 10,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    await client.end()
  }
}

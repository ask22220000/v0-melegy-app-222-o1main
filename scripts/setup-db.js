import postgres from "postgres"

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING, {
  ssl: "require",
  max: 1,
})

async function main() {
  console.log("[v0] Starting database setup...")

  await sql`
    CREATE TABLE IF NOT EXISTS melegy_users (
      mlg_user_id   TEXT PRIMARY KEY,
      plan          TEXT NOT NULL DEFAULT 'free',
      messages_used INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      last_seen_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
  console.log("[v0] melegy_users: OK")

  await sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    TEXT NOT NULL REFERENCES melegy_users(mlg_user_id) ON DELETE CASCADE,
      title      TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  console.log("[v0] conversations: OK")

  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
      content         TEXT NOT NULL,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `
  console.log("[v0] chat_messages: OK")

  await sql`
    CREATE TABLE IF NOT EXISTS plan_limits (
      plan           TEXT PRIMARY KEY,
      daily_messages INTEGER NOT NULL,
      label          TEXT
    )
  `

  await sql`
    INSERT INTO plan_limits (plan, daily_messages, label) VALUES
      ('free',    10,    'مجاني'),
      ('startup', 100,   'ستارتر'),
      ('pro',     500,   'برو'),
      ('vip',     99999, 'VIP')
    ON CONFLICT (plan) DO NOTHING
  `
  console.log("[v0] plan_limits: OK")

  // Notify Supabase PostgREST to reload schema cache
  try {
    await sql`NOTIFY pgrst, 'reload schema'`
    console.log("[v0] PostgREST schema cache reloaded")
  } catch (e) {
    console.log("[v0] Schema reload notify skipped:", e.message)
  }

  await sql.end()
  console.log("[v0] Database setup complete!")
}

main().catch((err) => {
  console.error("[v0] FAILED:", err.message)
  process.exit(1)
})

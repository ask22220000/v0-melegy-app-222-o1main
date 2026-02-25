import pg from "pg"

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const client = new pg.Client({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
})

async function run() {
  await client.connect()
  console.log("[v0] Connected to Supabase PostgreSQL")

  // Create melegy_users
  await client.query(`
    CREATE TABLE IF NOT EXISTS melegy_users (
      mlg_user_id   TEXT PRIMARY KEY,
      plan          TEXT NOT NULL DEFAULT 'free',
      messages_used INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      last_seen_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  console.log("[v0] melegy_users table ready")

  // Create conversations
  await client.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    TEXT NOT NULL REFERENCES melegy_users(mlg_user_id) ON DELETE CASCADE,
      title      TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  console.log("[v0] conversations table ready")

  // Create chat_messages
  await client.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
      content         TEXT NOT NULL,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  console.log("[v0] chat_messages table ready")

  // Create plan_limits
  await client.query(`
    CREATE TABLE IF NOT EXISTS plan_limits (
      plan           TEXT PRIMARY KEY,
      daily_messages INTEGER NOT NULL,
      label          TEXT
    );
    INSERT INTO plan_limits (plan, daily_messages, label) VALUES
      ('free',    10,    'مجاني'),
      ('startup', 100,   'ستارتر'),
      ('pro',     500,   'برو'),
      ('vip',     99999, 'VIP')
    ON CONFLICT (plan) DO NOTHING;
  `)
  console.log("[v0] plan_limits table ready")

  await client.end()
  console.log("[v0] Migration complete")
}

run().catch((err) => {
  console.error("[v0] Migration failed:", err.message)
  process.exit(1)
})

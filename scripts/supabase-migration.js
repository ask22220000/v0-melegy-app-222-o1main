import pg from "pg"

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const { Client } = pg

async function run() {
  // Try both connection strings
  const connStrings = [
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL,
  ].filter(Boolean)

  let client
  for (const cs of connStrings) {
    try {
      client = new Client({ connectionString: cs })
      await client.connect()
      console.log("[v0] Connected with:", cs.substring(0, 40) + "...")
      break
    } catch (e) {
      console.log("[v0] Failed with this conn string:", e.message)
      client = null
    }
  }

  if (!client) {
    console.error("[v0] Could not connect to any DB")
    process.exit(1)
  }

  // Drop and recreate to ensure clean state
  await client.query(`
    CREATE TABLE IF NOT EXISTS melegy_users (
      mlg_user_id   TEXT PRIMARY KEY,
      plan          TEXT NOT NULL DEFAULT 'free',
      messages_used INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      last_seen_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  console.log("[v0] melegy_users created")

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
  console.log("[v0] plan_limits created")

  await client.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    TEXT NOT NULL REFERENCES melegy_users(mlg_user_id) ON DELETE CASCADE,
      title      TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  console.log("[v0] conversations created")

  await client.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
      content         TEXT NOT NULL,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  console.log("[v0] chat_messages created")

  // NOTIFY PostgREST to reload schema cache
  await client.query(`NOTIFY pgrst, 'reload schema'`)
  console.log("[v0] PostgREST schema reload notified")

  // Verify
  const { rows } = await client.query(`SELECT COUNT(*) FROM melegy_users`)
  console.log("[v0] melegy_users row count:", rows[0].count)

  await client.end()
  console.log("[v0] Done!")
}

run().catch((e) => {
  console.error("[v0] Fatal:", e.message)
  process.exit(1)
})

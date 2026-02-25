import pg from "pg"

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
const { Client } = pg

async function run() {
  const connString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
  if (!connString) {
    console.error("[v0] No connection string found")
    process.exit(1)
  }

  const client = new Client({ connectionString: connString })
  await client.connect()
  console.log("[v0] Connected to DB")

  await client.query(`
    CREATE TABLE IF NOT EXISTS melegy_users (
      mlg_user_id   TEXT PRIMARY KEY,
      plan          TEXT NOT NULL DEFAULT 'free',
      messages_used INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  console.log("[v0] melegy_users OK")

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
  console.log("[v0] plan_limits OK")

  await client.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    TEXT NOT NULL REFERENCES melegy_users(mlg_user_id) ON DELETE CASCADE,
      title      TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  console.log("[v0] conversations OK")

  await client.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
      content         TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  console.log("[v0] chat_messages OK")

  // Force PostgREST schema cache reload
  await client.query(`NOTIFY pgrst, 'reload schema'`)
  console.log("[v0] PostgREST schema reloaded")

  const { rows } = await client.query(`SELECT COUNT(*) as cnt FROM melegy_users`)
  console.log("[v0] melegy_users rows:", rows[0].cnt)

  // Test insert to confirm table is working
  const testId = "mlg-test-" + Date.now()
  await client.query(
    `INSERT INTO melegy_users (mlg_user_id, plan, messages_used) VALUES ($1, 'free', 0)`,
    [testId]
  )
  await client.query(`DELETE FROM melegy_users WHERE mlg_user_id = $1`, [testId])
  console.log("[v0] Test insert/delete passed - DB is fully working")

  await client.end()
  console.log("[v0] Done!")
}

run().catch((e) => {
  console.error("[v0] Fatal:", e.message)
  process.exit(1)
})

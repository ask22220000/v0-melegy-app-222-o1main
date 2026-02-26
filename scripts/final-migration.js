import pg from "pg"

const { Client } = pg

async function run() {
  // POSTGRES_URL is the direct connection string from Supabase integration
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
  
  if (!connectionString) {
    console.error("[v0] No POSTGRES_URL found!")
    process.exit(1)
  }

  console.log("[v0] Connecting to:", connectionString.substring(0, 50) + "...")

  // Strip any existing sslmode param and force no-verify
  const connStr = connectionString.replace(/[?&]sslmode=[^&]*/g, "")
  const separator = connStr.includes("?") ? "&" : "?"
  const finalConn = `${connStr}${separator}sslmode=no-verify`

  const client = new Client({
    connectionString: finalConn,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  console.log("[v0] Connected successfully")

  // Create all tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS melegy_users (
      mlg_user_id   TEXT PRIMARY KEY,
      plan          TEXT NOT NULL DEFAULT 'free',
      messages_used INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  console.log("[v0] melegy_users table ready")

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

  await client.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    TEXT NOT NULL REFERENCES melegy_users(mlg_user_id) ON DELETE CASCADE,
      title      TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  console.log("[v0] conversations table ready")

  await client.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content         TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  console.log("[v0] chat_messages table ready")

  // Reload PostgREST schema cache — critical step
  await client.query(`NOTIFY pgrst, 'reload schema'`)
  console.log("[v0] PostgREST schema cache reloaded")

  // Verify tables exist
  const { rows } = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('melegy_users', 'plan_limits', 'conversations', 'chat_messages')
    ORDER BY table_name;
  `)
  console.log("[v0] Tables verified:", rows.map(r => r.table_name).join(", "))

  // Test insert and delete
  await client.query(`
    INSERT INTO melegy_users (mlg_user_id, plan, messages_used)
    VALUES ('mlg-test-verify', 'free', 0)
    ON CONFLICT (mlg_user_id) DO NOTHING;
  `)
  const { rows: testRows } = await client.query(`
    SELECT mlg_user_id FROM melegy_users WHERE mlg_user_id = 'mlg-test-verify'
  `)
  console.log("[v0] Test insert verified:", testRows.length > 0 ? "SUCCESS" : "FAILED")
  
  await client.query(`DELETE FROM melegy_users WHERE mlg_user_id = 'mlg-test-verify'`)
  console.log("[v0] Test cleanup done")

  await client.end()
  console.log("[v0] Migration complete!")
}

run().catch((err) => {
  console.error("[v0] Migration failed:", err.message)
  process.exit(1)
})

import pg from "pg"

const connectionString = process.env.POSTGRES_URL

const client = new pg.Client({ connectionString })
await client.connect()

console.log("Connected to database. Running migration...")

try {
  // Add columns to existing users table
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mlg_user_id TEXT UNIQUE`)
  console.log("  [OK] mlg_user_id column")

  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'`)
  console.log("  [OK] plan column")

  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS messages_used INTEGER NOT NULL DEFAULT 0`)
  console.log("  [OK] messages_used column")

  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ`)
  console.log("  [OK] last_seen_at column")

  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mlg_user_id ON users(mlg_user_id)`)
  console.log("  [OK] index on mlg_user_id")

  // Conversations table
  await client.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mlg_user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'محادثة جديدة',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  console.log("  [OK] conversations table")

  await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_mlg_user_id ON conversations(mlg_user_id)`)
  console.log("  [OK] index on conversations.mlg_user_id")

  // Chat messages table
  await client.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL,
      mlg_user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  console.log("  [OK] chat_messages table")

  await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id)`)
  console.log("  [OK] index on chat_messages.conversation_id")

  await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_mlg_user_id ON chat_messages(mlg_user_id)`)
  console.log("  [OK] index on chat_messages.mlg_user_id")

  // Plan limits table
  await client.query(`
    CREATE TABLE IF NOT EXISTS plan_limits (
      plan TEXT PRIMARY KEY,
      daily_messages INTEGER NOT NULL,
      label TEXT NOT NULL
    )
  `)
  console.log("  [OK] plan_limits table")

  await client.query(`
    INSERT INTO plan_limits (plan, daily_messages, label) VALUES
      ('free',    10,    'مجاني'),
      ('startup', 100,   'ستارتر'),
      ('pro',     500,   'برو'),
      ('vip',     99999, 'VIP')
    ON CONFLICT (plan) DO NOTHING
  `)
  console.log("  [OK] plan limits seeded")

  console.log("\nMigration completed successfully!")
} catch (err) {
  console.error("Migration error:", err.message)
} finally {
  await client.end()
}

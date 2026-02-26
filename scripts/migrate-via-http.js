/**
 * Migration via Supabase Management API (HTTP only, no TCP)
 * This bypasses pg SSL issues entirely.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("[migrate] Missing SUPABASE_URL or SERVICE_KEY")
  process.exit(1)
}

// Extract project ref from URL: https://xxxx.supabase.co -> xxxx
const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0]
console.log("[migrate] Project ref:", projectRef)

const SQL = `
CREATE TABLE IF NOT EXISTS melegy_users (
  mlg_user_id   TEXT PRIMARY KEY,
  plan          TEXT NOT NULL DEFAULT 'free',
  messages_used INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_limits (
  plan           TEXT PRIMARY KEY,
  daily_messages INTEGER NOT NULL DEFAULT 10,
  label          TEXT NOT NULL DEFAULT ''
);

INSERT INTO plan_limits (plan, daily_messages, label) VALUES
  ('free',    10,    'مجاني'),
  ('startup', 100,   'ستارتر'),
  ('pro',     500,   'برو'),
  ('vip',     99999, 'VIP')
ON CONFLICT (plan) DO NOTHING;

CREATE TABLE IF NOT EXISTS conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL REFERENCES melegy_users(mlg_user_id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'محادثة جديدة',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
`

async function runSQL(sql) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`
  // Try via pg-meta API (Management API)
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`

  console.log("[migrate] Trying Supabase Management API...")
  const res = await fetch(mgmtUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  const text = await res.text()
  console.log("[migrate] Management API status:", res.status)
  console.log("[migrate] Response:", text.substring(0, 300))
  return res.ok
}

async function verifyTable() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/melegy_users?select=mlg_user_id&limit=1`, {
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
  })
  const status = res.status
  const body = await res.text()
  console.log("[migrate] Verify melegy_users status:", status)
  console.log("[migrate] Verify body:", body.substring(0, 200))
  return res.ok
}

async function main() {
  await runSQL(SQL)
  console.log("[migrate] Verifying table via REST...")
  const ok = await verifyTable()
  if (ok) {
    console.log("[migrate] SUCCESS - melegy_users is accessible via Supabase REST")
  } else {
    console.log("[migrate] FAILED - table not accessible via REST API")
    console.log("[migrate] Go to Supabase dashboard > SQL editor and run the SQL manually")
  }
}

main().catch(e => {
  console.error("[migrate] Fatal:", e.message)
  process.exit(1)
})

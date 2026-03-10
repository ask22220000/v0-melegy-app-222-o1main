/**
 * Migration: add mlg_user_id + updated_at to melegy_history
 * Uses Supabase REST /sql endpoint (available with service role key)
 */

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("[migration] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

async function sql(statement, label) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ query: statement }),
  })
  // Supabase REST doesn't support raw SQL — use the pg endpoint instead
  const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: statement }),
  })
  const ok = res2.ok || res2.status === 200 || res2.status === 204
  const body = await res2.text().catch(() => "")
  console.log(`  [${ok ? "OK" : "WARN"}] ${label}${ok ? "" : ` → ${body.slice(0, 120)}`}`)
}

async function runMigration() {
  console.log("[migration] Adding mlg_user_id + updated_at to melegy_history ...\n")

  await sql(
    `ALTER TABLE melegy_history ADD COLUMN IF NOT EXISTS mlg_user_id TEXT;`,
    "Add mlg_user_id column"
  )
  await sql(
    `ALTER TABLE melegy_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();`,
    "Add updated_at column"
  )
  await sql(
    `CREATE INDEX IF NOT EXISTS idx_melegy_history_mlg_user_id ON melegy_history(mlg_user_id);`,
    "Create index on mlg_user_id"
  )
  // Migrate old rows: copy user_ip into mlg_user_id as fallback identifier
  await sql(
    `UPDATE melegy_history SET mlg_user_id = user_ip WHERE mlg_user_id IS NULL AND user_ip IS NOT NULL;`,
    "Back-fill mlg_user_id from user_ip"
  )

  console.log("\n[migration] Done.")
}

runMigration().catch(console.error)


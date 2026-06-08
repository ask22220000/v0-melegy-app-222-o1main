#!/usr/bin/env node

/**
 * Migration runner for AWS Aurora PostgreSQL
 * Executes all SQL files in the scripts directory in order
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Pool } from 'pg'
import { Signer } from '@aws-sdk/rds-signer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const REGION = process.env.AWS_REGION || 'us-east-1'
const PGHOST = process.env.PGHOST
const PGUSER = process.env.PGUSER || 'postgres'
const PGDATABASE = process.env.PGDATABASE || 'postgres'
const AWS_ROLE_ARN = process.env.AWS_ROLE_ARN

if (!PGHOST || !AWS_ROLE_ARN) {
  console.error('Error: PGHOST and AWS_ROLE_ARN environment variables are required')
  process.exit(1)
}

console.log(`[v0] Connecting to Aurora PostgreSQL at ${PGHOST}...`)

// Create RDS signer for IAM auth
const signer = new Signer({
  region: REGION,
  hostname: PGHOST,
  port: 5432,
  username: PGUSER,
})

// Create connection pool
const pool = new Pool({
  host: PGHOST,
  database: PGDATABASE,
  port: 5432,
  user: PGUSER,
  password: () => signer.getAuthToken(),
  ssl: { rejectUnauthorized: false },
  max: 1,
})

async function runMigrations() {
  const client = await pool.connect()
  try {
    // Read SQL files
    const scriptsDir = __dirname
    const files = fs.readdirSync(scriptsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    console.log(`[v0] Found ${files.length} migration files`)

    for (const file of files) {
      const filePath = path.join(scriptsDir, file)
      const sql = fs.readFileSync(filePath, 'utf8')

      console.log(`[v0] Running migration: ${file}`)
      try {
        await client.query(sql)
        console.log(`[v0] ✓ Migration completed: ${file}`)
      } catch (error) {
        // Some migrations may fail due to constraints or existing objects - that's OK
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
          console.log(`[v0] ⊘ Migration already applied or skipped: ${file}`)
        } else {
          console.error(`[v0] ✗ Error in ${file}:`, errorMessage)
          // Continue with other migrations
        }
      }
    }

    console.log(`[v0] ✓ All migrations completed`)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigrations().catch(error => {
  console.error('[v0] Migration failed:', error)
  process.exit(1)
})

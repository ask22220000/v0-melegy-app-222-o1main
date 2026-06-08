/**
 * lib/auth-db.ts — PostgreSQL Authentication Database
 * Uses AWS Aurora PostgreSQL with IAM authentication for user/session management
 */

import { Pool, ClientBase } from 'pg'
import { Signer } from '@aws-sdk/rds-signer'
import { awsCredentialsProvider } from '@vercel/functions/oidc'
import { attachDatabasePool } from '@vercel/functions'

// ─── Initialize Database Pool ────────────────────────────────────────────────

const signer = new Signer({
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN!,
    clientConfig: { region: process.env.AWS_REGION || 'us-east-1' },
  }),
  region: process.env.AWS_REGION || 'us-east-1',
  hostname: process.env.PGHOST!,
  username: process.env.PGUSER || 'postgres',
  port: 5432,
})

const pool = new Pool({
  host: process.env.PGHOST!,
  database: process.env.PGDATABASE || 'postgres',
  port: 5432,
  user: process.env.PGUSER || 'postgres',
  password: () => signer.getAuthToken(),
  ssl: { rejectUnauthorized: false },
  max: 20,
})

attachDatabasePool(pool)

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number
  email: string
  password_hash?: string | null
  google_id?: string | null
  first_name?: string | null
  last_name?: string | null
  created_at: string
  updated_at: string
}

export interface AuthSession {
  id: number
  user_id: number
  token: string
  expires_at: string
  created_at: string
}

// ─── User Operations ─────────────────────────────────────────────────────────

export async function getUserByEmail(email: string): Promise<AuthUser | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM auth_users WHERE email = $1 LIMIT 1',
      [email]
    )
    return result.rows[0] || null
  } catch (error) {
    console.error('[v0] getUserByEmail error:', error)
    return null
  }
}

export async function getUserByGoogleId(googleId: string): Promise<AuthUser | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM auth_users WHERE google_id = $1 LIMIT 1',
      [googleId]
    )
    return result.rows[0] || null
  } catch (error) {
    console.error('[v0] getUserByGoogleId error:', error)
    return null
  }
}

export async function getUserById(id: number): Promise<AuthUser | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM auth_users WHERE id = $1 LIMIT 1',
      [id]
    )
    return result.rows[0] || null
  } catch (error) {
    console.error('[v0] getUserById error:', error)
    return null
  }
}

export async function createUser(data: {
  email: string
  password_hash?: string | null
  google_id?: string | null
  first_name?: string | null
  last_name?: string | null
}): Promise<AuthUser> {
  try {
    const result = await pool.query(
      `INSERT INTO auth_users (email, password_hash, google_id, first_name, last_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [data.email, data.password_hash || null, data.google_id || null, data.first_name || null, data.last_name || null]
    )
    return result.rows[0]
  } catch (error) {
    console.error('[v0] createUser error:', error)
    throw error
  }
}

export async function updateUser(id: number, data: Partial<AuthUser>): Promise<AuthUser | null> {
  try {
    const updates: string[] = []
    const values: any[] = [id]
    let paramIndex = 2

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`)
      values.push(data.email)
    }
    if (data.password_hash !== undefined) {
      updates.push(`password_hash = $${paramIndex++}`)
      values.push(data.password_hash)
    }
    if (data.google_id !== undefined) {
      updates.push(`google_id = $${paramIndex++}`)
      values.push(data.google_id)
    }
    if (data.first_name !== undefined) {
      updates.push(`first_name = $${paramIndex++}`)
      values.push(data.first_name)
    }
    if (data.last_name !== undefined) {
      updates.push(`last_name = $${paramIndex++}`)
      values.push(data.last_name)
    }

    updates.push(`updated_at = NOW()`)

    if (updates.length === 1) return getUserById(id) // Only updated_at, no changes

    const result = await pool.query(
      `UPDATE auth_users SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      values
    )
    return result.rows[0] || null
  } catch (error) {
    console.error('[v0] updateUser error:', error)
    return null
  }
}

// ─── Session Operations ──────────────────────────────────────────────────────

export async function createSession(userId: number, token: string, expiresAt: Date): Promise<AuthSession> {
  try {
    const result = await pool.query(
      `INSERT INTO auth_sessions (user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [userId, token, expiresAt.toISOString()]
    )
    return result.rows[0]
  } catch (error) {
    console.error('[v0] createSession error:', error)
    throw error
  }
}

export async function getSessionByToken(token: string): Promise<AuthSession | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM auth_sessions WHERE token = $1 AND expires_at > NOW() LIMIT 1',
      [token]
    )
    return result.rows[0] || null
  } catch (error) {
    console.error('[v0] getSessionByToken error:', error)
    return null
  }
}

export async function deleteSession(token: string): Promise<void> {
  try {
    await pool.query(
      'DELETE FROM auth_sessions WHERE token = $1',
      [token]
    )
  } catch (error) {
    console.error('[v0] deleteSession error:', error)
  }
}

export async function deleteExpiredSessions(): Promise<void> {
  try {
    await pool.query(
      'DELETE FROM auth_sessions WHERE expires_at <= NOW()'
    )
  } catch (error) {
    console.error('[v0] deleteExpiredSessions error:', error)
  }
}

// ─── Conversation Operations (linked to auth users) ──────────────────────────

export async function createConversation(userId: number, title?: string): Promise<any> {
  try {
    const result = await pool.query(
      `INSERT INTO conversations (user_id, title, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING *`,
      [userId, title || null]
    )
    return result.rows[0]
  } catch (error) {
    console.error('[v0] createConversation error:', error)
    throw error
  }
}

export async function getConversationsByUserId(userId: number): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM conversations WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    )
    return result.rows
  } catch (error) {
    console.error('[v0] getConversationsByUserId error:', error)
    return []
  }
}

export async function deleteConversation(conversationId: number, userId: number): Promise<void> {
  try {
    await pool.query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    )
  } catch (error) {
    console.error('[v0] deleteConversation error:', error)
  }
}

// ─── Chat Message Operations ─────────────────────────────────────────────────

export async function addChatMessage(conversationId: number, userId: number, role: string, content: string): Promise<any> {
  try {
    const result = await pool.query(
      `INSERT INTO chat_messages (conversation_id, user_id, role, content, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [conversationId, userId, role, content]
    )
    return result.rows[0]
  } catch (error) {
    console.error('[v0] addChatMessage error:', error)
    throw error
  }
}

export async function getChatMessages(conversationId: number): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversationId]
    )
    return result.rows
  } catch (error) {
    console.error('[v0] getChatMessages error:', error)
    return []
  }
}

// ─── Utility for transaction operations ───────────────────────────────────────

export async function withTransaction<T>(fn: (client: ClientBase) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export { pool }

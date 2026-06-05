/**
 * lib/auth.ts — Authentication utilities
 */
import { randomBytes } from 'crypto'
import bcryptjs from 'bcryptjs'
import { query } from './db'

export interface User {
  id: number
  email: string
  name: string | null
  google_id: string | null
  password_hash?: string
  created_at: string
  updated_at: string
}

export interface Session {
  id: number
  user_id: number
  token: string
  expires_at: string
  created_at: string
}

/**
 * Hash a password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(10)
  return bcryptjs.hash(password, salt)
}

/**
 * Compare a password with its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash)
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Create a new user
 */
export async function createUser(email: string, password: string, name?: string): Promise<User> {
  const passwordHash = await hashPassword(password)
  const result = await query(
    `INSERT INTO users (email, password_hash, name, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING id, email, name, google_id, created_at, updated_at`,
    [email, passwordHash, name || null]
  )
  return result.rows[0]
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await query(
    `SELECT id, email, name, google_id, created_at, updated_at FROM users WHERE email = $1`,
    [email]
  )
  return result.rows[0] || null
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number): Promise<User | null> {
  const result = await query(
    `SELECT id, email, name, google_id, created_at, updated_at FROM users WHERE id = $1`,
    [userId]
  )
  return result.rows[0] || null
}

/**
 * Create or get user by Google ID
 */
export async function upsertGoogleUser(
  googleId: string,
  email: string,
  name: string
): Promise<User> {
  const result = await query(
    `INSERT INTO users (email, google_id, name, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (google_id) DO UPDATE
     SET email = $1, name = $3, updated_at = NOW()
     RETURNING id, email, name, google_id, created_at, updated_at`,
    [email, googleId, name]
  )
  return result.rows[0]
}

/**
 * Create a session for a user
 */
export async function createSession(userId: number, expiresInDays = 30): Promise<Session> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
  
  const result = await query(
    `INSERT INTO sessions (user_id, token, expires_at, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, user_id, token, expires_at, created_at`,
    [userId, token, expiresAt.toISOString()]
  )
  return result.rows[0]
}

/**
 * Get session and verify it's not expired
 */
export async function getValidSession(token: string): Promise<{ session: Session; user: User } | null> {
  const result = await query(
    `SELECT s.id, s.user_id, s.token, s.expires_at, s.created_at
     FROM sessions s
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  )
  
  if (!result.rows.length) return null
  
  const session = result.rows[0]
  const user = await getUserById(session.user_id)
  
  if (!user) return null
  
  return { session, user }
}

/**
 * Delete a session
 */
export async function deleteSession(token: string): Promise<void> {
  await query(`DELETE FROM sessions WHERE token = $1`, [token])
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await query(`DELETE FROM sessions WHERE expires_at < NOW()`)
  return result.rowCount || 0
}

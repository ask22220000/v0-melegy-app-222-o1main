import { NextRequest, NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { getUserByEmail, createSession } from '@/lib/auth-db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user
    const user = await getUserByEmail(email)
    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create session token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await createSession(user.id, token, expiresAt)

    // Return user data and token
    const { password_hash, ...userResponse } = user
    return NextResponse.json({
      user: userResponse,
      token,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('[v0] Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}

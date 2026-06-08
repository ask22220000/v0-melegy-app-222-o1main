import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getUserByGoogleId, createUser, createSession } from '@/lib/auth-db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { googleId, email, firstName, lastName } = body

    // Validation
    if (!googleId || !email) {
      return NextResponse.json(
        { error: 'معرّف Google والبريد الإلكتروني مطلوبان' },
        { status: 400 }
      )
    }

    // Check if user exists by Google ID
    let user = await getUserByGoogleId(googleId)

    // If not found by Google ID, try to find by email
    if (!user) {
      const { getUserByEmail } = await import('@/lib/auth-db')
      const existingUser = await getUserByEmail(email)
      
      if (existingUser) {
        // Link Google account to existing user
        const { updateUser } = await import('@/lib/auth-db')
        user = await updateUser(existingUser.id, { google_id: googleId })
      } else {
        // Create new user
        user = await createUser({
          email,
          google_id: googleId,
          first_name: firstName || null,
          last_name: lastName || null,
        })
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'فشل معالجة تسجيل الدخول عبر Google' },
        { status: 500 }
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
    console.error('[v0] Google callback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'فشل تسجيل الدخول عبر Google'
    return NextResponse.json(
      { error: errorMessage || 'فشل تسجيل الدخول عبر Google' },
      { status: 500 }
    )
  }
}

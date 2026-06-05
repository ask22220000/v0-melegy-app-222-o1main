/**
 * app/api/auth/google/callback/route.ts — Google OAuth callback
 * Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables
 */
import { NextRequest, NextResponse } from 'next/server'
import { upsertGoogleUser, createSession } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code) {
      return NextResponse.json({ error: 'No authorization code' }, { status: 400 })
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/google/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 400 })
    }

    const { access_token } = await tokenResponse.json()

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!userResponse.ok) {
      return NextResponse.json({ error: 'Failed to get user info' }, { status: 400 })
    }

    const { id: googleId, email, name } = await userResponse.json()

    // Create or update user
    const user = await upsertGoogleUser(googleId, email, name)

    // Create session
    const session = await createSession(user.id)

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })

    // Redirect to home
    return NextResponse.redirect(new URL('/', request.url))
  } catch (error) {
    console.error('[v0] Google callback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * app/api/auth/session/route.ts — Get current session
 */
import { NextRequest, NextResponse } from 'next/server'
import { getValidSession } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ user: null })
    }

    const result = await getValidSession(token)
    if (!result) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    })
  } catch (error) {
    console.error('[v0] Session error:', error)
    return NextResponse.json({ user: null })
  }
}

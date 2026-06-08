import { NextRequest, NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import { createUser, getUserByEmail } from '@/lib/auth-db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName } = body

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const user = await createUser({
      email,
      password_hash: passwordHash,
      first_name: firstName || null,
      last_name: lastName || null,
    })

    // Remove sensitive data before returning
    const { password_hash, ...userResponse } = user
    return NextResponse.json(userResponse, { status: 201 })
  } catch (error) {
    console.error('[v0] Signup error:', error)
    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    )
  }
}

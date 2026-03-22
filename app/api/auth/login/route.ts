import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { NextRequest, NextResponse } from "next/server"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  )
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "البريد الإلكتروني وكلمة المرور مطلوبة" }, { status: 400 })
    }

    // Find user
    const supabase = getSupabaseClient()
    const { data: user, error } = await supabase
      .from("melegy_users")
      .select("*")
      .eq("email", email)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }, { status: 401 })
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash)

    if (!passwordMatch) {
      return NextResponse.json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }, { status: 401 })
    }

    // Create JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" })

    // Update last_login
    const updateSupabase = getSupabaseClient()
    await updateSupabase
      .from("melegy_users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id)

    return NextResponse.json({
      token,
      userId: user.id,
      email: user.email,
      plan: user.plan,
    })
  } catch (err) {
    console.error("[v0] Login endpoint error:", err)
    return NextResponse.json({ error: "حدث خطأ في السيرفر" }, { status: 500 })
  }
}

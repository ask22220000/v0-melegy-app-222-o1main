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

    // Check if user already exists
    const supabase = getSupabaseClient()
    const { data: existingUser } = await supabase
      .from("melegy_users")
      .select("id")
      .eq("email", email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: "هذا البريد الإلكتروني مسجل بالفعل" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const createSupabase = getSupabaseClient()
    const { data: newUser, error } = await createSupabase
      .from("melegy_users")
      .insert({
        email,
        password_hash: hashedPassword,
        plan: "free",
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !newUser) {
      console.error("[v0] Registration error:", error)
      return NextResponse.json({ error: "فشل إنشاء الحساب" }, { status: 500 })
    }

    // Create JWT token
    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: "30d" })

    return NextResponse.json({
      token,
      userId: newUser.id,
      email: newUser.email,
      plan: newUser.plan,
    })
  } catch (err) {
    console.error("[v0] Register endpoint error:", err)
    return NextResponse.json({ error: "حدث خطأ في السيرفر" }, { status: 500 })
  }
}

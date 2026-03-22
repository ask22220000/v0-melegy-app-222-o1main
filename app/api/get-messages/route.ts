import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  )
}

function getAuthToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  return authHeader.slice(7)
}

function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any
    return { userId: payload.userId }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = getAuthToken(req)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const auth = verifyToken(token)
    if (!auth) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get("conversationId")

    const supabase = getSupabaseClient()
    let query = supabase
      .from("melegy_history")
      .select("*")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: true })

    if (conversationId) {
      query = query.eq("conversation_id", conversationId)
    }

    const { data, error } = await query

    if (error) {
      console.error("[v0] Get messages error:", error)
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }

    return NextResponse.json({ messages: data })
  } catch (err) {
    console.error("[v0] Get messages endpoint error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

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

export async function POST(req: NextRequest) {
  try {
    const token = getAuthToken(req)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const auth = verifyToken(token)
    if (!auth) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { message, isUserMessage, imageUrl, videoUrl, conversationId } = await req.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Save to melegy_history
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("melegy_history")
      .insert({
        user_id: auth.userId,
        chat_title: isUserMessage ? message.substring(0, 50) : "AI Response",
        chat_message: message,
        image_url: imageUrl,
        video_url: videoUrl,
        conversation_id: conversationId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Save message error:", error)
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
    }

    return NextResponse.json({ id: data.id, message: "Message saved" })
  } catch (err) {
    console.error("[v0] Save message endpoint error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

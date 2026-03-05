import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET /api/save-chat?user_ip=xxx — load all saved chats for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userIp = searchParams.get("user_ip") || request.headers.get("x-forwarded-for") || "unknown"

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await supabase
      .from("melegy_history")
      .select("id, chat_title, chat_date, messages")
      .eq("user_ip", userIp)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Parse messages back to objects if stored as string
    const histories = (data || []).map((row: any) => ({
      id: row.id,
      title: row.chat_title,
      date: row.chat_date,
      messages: typeof row.messages === "string" ? JSON.parse(row.messages) : row.messages,
    }))

    return NextResponse.json({ histories })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/save-chat — save a full conversation with all media fields preserved
export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { chat_title, chat_date, messages } = await request.json()

    const userIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    // Store messages as real jsonb — preserves imageUrl, videoUrl, excelData, designData
    const messagesValue = typeof messages === "string" ? JSON.parse(messages) : messages

    const { data, error } = await supabase.from("melegy_history").insert({
      chat_title,
      chat_date,
      messages: messagesValue,
      user_ip: userIp,
    })

    if (error) {
      console.error("[v0] Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Save chat error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

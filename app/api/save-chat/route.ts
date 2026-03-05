import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET /api/save-chat — load all saved chats for the calling user (identified by IP)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userIp =
      searchParams.get("user_ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      "unknown"

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Select all columns so we never fail on a missing specific column
    const { data, error } = await supabase
      .from("melegy_history")
      .select("*")
      .eq("user_ip", userIp)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("[v0] GET melegy_history error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const histories = (data || []).map((row: any) => ({
      // Support both uuid `id` and integer `id` — fall back to row index if absent
      id: row.id ?? row.rowid ?? String(Date.now()),
      title: row.chat_title ?? row.title ?? "محادثة",
      date: row.chat_date ?? row.date ?? "",
      messages: typeof row.messages === "string" ? JSON.parse(row.messages) : (row.messages ?? []),
    }))

    return NextResponse.json({ histories })
  } catch (err: any) {
    console.error("[v0] GET save-chat exception:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/save-chat — save a full conversation (all media fields preserved as jsonb)
export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { chat_title, chat_date, messages } = await request.json()

    const userIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"

    const messagesValue = typeof messages === "string" ? JSON.parse(messages) : messages

    const { data, error } = await supabase
      .from("melegy_history")
      .insert({ chat_title, chat_date, messages: messagesValue, user_ip: userIp })
      .select("*")
      .single()

    if (error) {
      console.error("[v0] POST melegy_history error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id ?? null })
  } catch (err: any) {
    console.error("[v0] POST save-chat exception:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET /api/save-chat?user_id=mlg_xxx — load all saved chats for the calling user (by mlg_user_id)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mlgUserId = searchParams.get("user_id")

    if (!mlgUserId) {
      return NextResponse.json({ histories: [] })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from("melegy_history")
      .select("*")
      .eq("mlg_user_id", mlgUserId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      // If column doesn't exist yet, fall back to IP lookup
      if (error.message?.includes("mlg_user_id")) {
        console.error("[v0] melegy_history missing mlg_user_id column:", error.message)
        return NextResponse.json({ histories: [] })
      }
      console.error("[v0] GET melegy_history error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const histories = (data || []).map((row: any) => ({
      id: row.id ?? String(Date.now()),
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

// POST /api/save-chat — save a full conversation linked to mlg_user_id
export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { chat_title, chat_date, messages, mlg_user_id } = await request.json()

    if (!mlg_user_id) {
      return NextResponse.json({ error: "Missing mlg_user_id" }, { status: 400 })
    }

    const messagesValue = typeof messages === "string" ? JSON.parse(messages) : messages

    // Upsert: if same user + title + date already exists, update it; otherwise insert
    const { data: existing } = await supabase
      .from("melegy_history")
      .select("id")
      .eq("mlg_user_id", mlg_user_id)
      .eq("chat_title", chat_title)
      .eq("chat_date", chat_date)
      .single()

    let result
    if (existing?.id) {
      // Update existing conversation
      result = await supabase
        .from("melegy_history")
        .update({ messages: messagesValue, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select("id")
        .single()
    } else {
      // Insert new conversation
      result = await supabase
        .from("melegy_history")
        .insert({
          mlg_user_id,
          chat_title,
          chat_date,
          messages: messagesValue,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single()
    }

    if (result.error) {
      console.error("[v0] POST melegy_history error:", result.error.message)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: result.data?.id ?? null })
  } catch (err: any) {
    console.error("[v0] POST save-chat exception:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

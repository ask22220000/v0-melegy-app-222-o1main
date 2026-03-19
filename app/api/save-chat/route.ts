import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET /api/save-chat?user_id=<auth_uuid> — load all saved chats for the user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ histories: [] })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from("melegy_history")
      .select("id, chat_title, chat_date, messages, created_at, updated_at")
      .eq("auth_user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("[save-chat GET] error:", error.message)
      return NextResponse.json({ histories: [], _error: error.message })
    }

    const histories = (data || []).map((row: any) => ({
      id: row.id,
      title: row.chat_title ?? "محادثة",
      date: row.chat_date ?? row.created_at?.slice(0, 10) ?? "",
      messages: typeof row.messages === "string" ? JSON.parse(row.messages) : (row.messages ?? []),
    }))

    return NextResponse.json({ histories })
  } catch (err: any) {
    console.error("[save-chat GET] exception:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/save-chat — save or update a conversation linked to auth_user_id
export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()
    const { chat_title, chat_date, messages, user_id } = body

    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 })
    }

    const resolvedUserId = user_id

    const messagesValue = typeof messages === "string" ? JSON.parse(messages) : messages
    const now = new Date().toISOString()

    // Check if this chat already exists for this user
    const { data: existing } = await supabase
      .from("melegy_history")
      .select("id")
      .eq("auth_user_id", resolvedUserId)
      .eq("chat_title", chat_title)
      .eq("chat_date", chat_date)
      .maybeSingle()

    if (existing?.id) {
      // Update existing
      const { error: updateError } = await supabase
        .from("melegy_history")
        .update({ messages: messagesValue, updated_at: now })
        .eq("id", existing.id)

      if (updateError) {
        console.error("[save-chat POST] update error:", updateError.message)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, id: existing.id })
    }

    // Insert new
    const { data: inserted, error: insertError } = await supabase
      .from("melegy_history")
      .insert({
        auth_user_id: resolvedUserId,
        chat_title,
        chat_date,
        messages: messagesValue,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("[save-chat POST] insert error:", insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: inserted?.id ?? null })
  } catch (err: any) {
    console.error("[save-chat POST] exception:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

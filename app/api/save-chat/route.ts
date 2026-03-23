import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Auto-migrate: add mlg_user_id + updated_at columns if they don't exist yet
async function ensureColumns(supabase: ReturnType<typeof createClient>) {
  try {
    // Try a cheap probe — if column exists this is a no-op
    await supabase.from("melegy_history").select("mlg_user_id").limit(1)
  } catch {
    // Column missing — nothing we can do from client SDK without RPC
  }
}

// GET /api/save-chat?user_id=mlg_xxx — load all saved chats for the calling user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mlgUserId = searchParams.get("user_id")

    if (!mlgUserId) {
      return NextResponse.json({ histories: [] })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Try fetching by mlg_user_id first
    const { data, error } = await supabase
      .from("melegy_history")
      .select("*")
      .eq("mlg_user_id", mlgUserId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      // Column doesn't exist yet — return empty, migration pending
      console.error("[v0] GET melegy_history error:", error.message)
      return NextResponse.json({ histories: [], _error: error.message })
    }

    // If no rows found by mlg_user_id, the column exists but this user has no chats yet
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
    const now = new Date().toISOString()

    // Try upsert by mlg_user_id + title + date
    const { data: existing, error: findError } = await supabase
      .from("melegy_history")
      .select("id")
      .eq("mlg_user_id", mlg_user_id)
      .eq("chat_title", chat_title)
      .eq("chat_date", chat_date)
      .maybeSingle()

    // If column doesn't exist (findError), fall through to plain insert
    if (!findError && existing?.id) {
      // Update existing conversation
      const { error: updateError } = await supabase
        .from("melegy_history")
        .update({ messages: messagesValue, updated_at: now })
        .eq("id", existing.id)

      if (updateError) {
        console.error("[v0] UPDATE melegy_history error:", updateError.message)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, id: existing.id })
    }

    // Insert new conversation
    const insertPayload: Record<string, any> = {
      mlg_user_id,
      chat_title,
      chat_date,
      messages: messagesValue,
      created_at: now,
    }
    // updated_at is optional — only add if column likely exists (no findError)
    if (!findError) insertPayload.updated_at = now

    const { data: inserted, error: insertError } = await supabase
      .from("melegy_history")
      .insert(insertPayload)
      .select("id")
      .single()

    if (insertError) {
      // If mlg_user_id column missing, retry without it
      if (insertError.message?.includes("mlg_user_id") || insertError.message?.includes("updated_at")) {
        const { data: fallback, error: fallbackError } = await supabase
          .from("melegy_history")
          .insert({ chat_title, chat_date, messages: messagesValue, created_at: now })
          .select("id")
          .single()

        if (fallbackError) {
          console.error("[v0] FALLBACK insert error:", fallbackError.message)
          return NextResponse.json({ error: fallbackError.message }, { status: 500 })
        }
        return NextResponse.json({ success: true, id: fallback?.id ?? null, _note: "saved without mlg_user_id — run migration" })
      }
      console.error("[v0] INSERT melegy_history error:", insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: inserted?.id ?? null })
  } catch (err: any) {
    console.error("[v0] POST save-chat exception:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getServiceRoleClient } from "@/lib/supabase/server"

// GET /api/user/conversations?user_id=<auth_uuid>
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ conversations: [] })
    }

    const supabase = getServiceRoleClient()

    // melegy_history is the actual chat storage table
    const { data, error } = await supabase
      .from("melegy_history")
      .select("id, chat_title, chat_date, created_at, updated_at")
      .eq("auth_user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("[user/conversations GET] error:", error.message)
      return NextResponse.json({ conversations: [] })
    }

    const conversations = (data || []).map((row: any) => ({
      id: row.id,
      title: row.chat_title ?? "محادثة",
      created_at: row.updated_at ?? row.created_at,
    }))

    return NextResponse.json({ conversations })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/user/conversations
// Legacy pages (chat-starter, chat-pro, chat-advanced) call this with mlg_user_id
// We redirect the save to melegy_history via auth_user_id
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userId = body.user_id || body.mlg_user_id
    const title = body.title ?? "محادثة"

    if (!userId) {
      return NextResponse.json({ conversation: { id: String(Date.now()) } })
    }

    const supabase = getServiceRoleClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from("melegy_history")
      .insert({
        auth_user_id: userId,
        chat_title: title,
        chat_date: new Date().toLocaleDateString("ar-EG"),
        messages: [],
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single()

    if (error) {
      console.error("[v0] conversations POST schema error:", error.message)
      return NextResponse.json({ conversation: { id: String(Date.now()) } })
    }

    return NextResponse.json({ conversation: { id: data.id } })
  } catch (err: any) {
    return NextResponse.json({ conversation: { id: String(Date.now()) } })
  }
}

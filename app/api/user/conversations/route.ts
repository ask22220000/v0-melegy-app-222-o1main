import { NextRequest, NextResponse } from "next/server"
import { getServiceRoleClient } from "@/lib/supabase/server"

// GET /api/user/conversations?user_id=<id>
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) return NextResponse.json({ conversations: [] })

    const supabase = getServiceRoleClient()

    const { data, error } = await supabase
      .from("melegy_history")
      .select("id, chat_title, chat_date, created_at")
      .eq("auth_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ conversations: [] })
    }

    const conversations = (data ?? []).map((row: any) => ({
      id: row.id,
      title: row.chat_title ?? "محادثة",
      created_at: row.created_at,
    }))

    return NextResponse.json({ conversations })
  } catch {
    return NextResponse.json({ conversations: [] })
  }
}

// POST /api/user/conversations — called by legacy chat pages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userId = body.user_id
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
      })
      .select("id")
      .single()

    if (error) {
      return NextResponse.json({ conversation: { id: String(Date.now()) } })
    }

    return NextResponse.json({ conversation: { id: data.id } })
  } catch {
    return NextResponse.json({ conversation: { id: String(Date.now()) } })
  }
}

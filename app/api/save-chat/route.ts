import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  getConversations,
  saveConversation,
  updateConversationMessages,
  ensureUserMeta,
} from "@/lib/db"

export const runtime = "nodejs"

// GET /api/save-chat?user_id=mlg_xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) return NextResponse.json({ histories: [] })

    const conversations = await getConversations(userId, 100)
    const histories = conversations.map((c) => ({
      id: c.SK ?? c.id,
      title: c.title ?? "محادثة",
      date: c.date ?? c.createdAt?.slice(0, 10) ?? "",
      messages: Array.isArray(c.messages) ? c.messages : [],
    }))

    return NextResponse.json({ histories })
  } catch (err: any) {
    console.error("[save-chat] GET error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/save-chat
export async function POST(request: Request) {
  try {
    const { chat_title, chat_date, messages, mlg_user_id } = await request.json()

    if (!mlg_user_id) {
      return NextResponse.json({ error: "Missing mlg_user_id" }, { status: 400 })
    }

    await ensureUserMeta(mlg_user_id)

    // Check if conversation with same title+date already exists
    const existing = await getConversations(mlg_user_id, 200)
    const match = existing.find((c) => c.title === chat_title && c.date === chat_date)

    if (match?.SK) {
      await updateConversationMessages(mlg_user_id, match.SK, messages)
      return NextResponse.json({ success: true, id: match.SK })
    }

    const id = await saveConversation({
      userId: mlg_user_id,
      title: chat_title,
      date: chat_date,
      messages,
    })

    return NextResponse.json({ success: true, id })
  } catch (err: any) {
    console.error("[save-chat] POST error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  getConversations,
  saveConversation,
  incrementAnalytics,
  ensureUserMeta,
} from "@/lib/db"

export const runtime = "nodejs"

// GET /api/save-chat?user_id=mlg_xxx — load all saved conversations for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ histories: [] })
    }

    const conversations = await getConversations(userId, 50)

    const histories = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title ?? "محادثة",
      date: conv.date ?? "",
      messages: conv.messages ?? [],
      sk: (conv as any).SK, // pass SK back so frontend can update by SK
    }))

    return NextResponse.json({ histories })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف"
    console.error("[save-chat] GET error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/save-chat — save or update a conversation
export async function POST(request: Request) {
  try {
    const { chat_title, chat_date, messages, mlg_user_id } = await request.json()

    if (!mlg_user_id) {
      return NextResponse.json({ error: "Missing mlg_user_id" }, { status: 400 })
    }

    // Ensure user exists in DB
    await ensureUserMeta(mlg_user_id)

    const id = await saveConversation({
      userId: mlg_user_id,
      title: chat_title ?? "محادثة",
      date: chat_date ?? new Date().toISOString().slice(0, 10),
      messages: typeof messages === "string" ? JSON.parse(messages) : (messages ?? []),
    })

    // Increment global analytics counter (fire-and-forget)
    incrementAnalytics("totalConversations").catch(() => {})
    incrementAnalytics("totalMessages", (messages ?? []).length).catch(() => {})

    return NextResponse.json({ success: true, id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف"
    console.error("[save-chat] POST error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

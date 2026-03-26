import { NextRequest, NextResponse } from "next/server"
import { getConversations, saveConversation, deleteConversation, ensureUserMeta } from "@/lib/db"

export const runtime = "nodejs"

// GET /api/user/conversations?user_id=mlg_xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ conversations: [] })
    }

    const conversations = await getConversations(userId, 100)
    return NextResponse.json({ conversations })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف"
    console.error("[user/conversations] GET error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/user/conversations — create new conversation
export async function POST(request: NextRequest) {
  try {
    const { mlg_user_id, title, messages, date } = await request.json()

    if (!mlg_user_id) {
      return NextResponse.json({ error: "Missing mlg_user_id" }, { status: 400 })
    }

    await ensureUserMeta(mlg_user_id)

    const id = await saveConversation({
      userId: mlg_user_id,
      title: title ?? "محادثة جديدة",
      date: date ?? new Date().toISOString().slice(0, 10),
      messages: messages ?? [],
    })

    return NextResponse.json({ conversation: { id, title: title ?? "محادثة جديدة", createdAt: new Date().toISOString() } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف"
    console.error("[user/conversations] POST error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/user/conversations — delete conversation by SK
export async function DELETE(request: NextRequest) {
  try {
    const { user_id, sk } = await request.json()
    if (!user_id || !sk) {
      return NextResponse.json({ error: "Missing user_id or sk" }, { status: 400 })
    }
    await deleteConversation(user_id, sk)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف"
    console.error("[user/conversations] DELETE error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

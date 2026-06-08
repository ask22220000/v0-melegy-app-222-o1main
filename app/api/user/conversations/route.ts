import { NextRequest, NextResponse } from "next/server"
import { getConversations, saveConversation, ensureUserMeta } from "@/lib/db"

export const runtime = "nodejs"

// GET /api/user/conversations?user_id=mlg_xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) return NextResponse.json({ error: "Missing user_id" }, { status: 400 })

    const convs = await getConversations(userId, 100)
    const conversations = convs.map((c) => ({
      id: c.SK ?? c.id,
      title: c.title ?? "محادثة",
      created_at: c.createdAt ?? "",
      updated_at: c.createdAt ?? "",
    }))

    return NextResponse.json({ conversations })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/user/conversations
export async function POST(request: NextRequest) {
  try {
    const { mlg_user_id, title } = await request.json()

    if (!mlg_user_id) return NextResponse.json({ error: "Missing mlg_user_id" }, { status: 400 })

    await ensureUserMeta(mlg_user_id)

    const id = await saveConversation({
      userId: mlg_user_id,
      title: title || "محادثة جديدة",
      date: new Date().toISOString().slice(0, 10),
      messages: [],
    })

    return NextResponse.json({
      conversation: { id, title: title || "محادثة جديدة", created_at: new Date().toISOString() },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

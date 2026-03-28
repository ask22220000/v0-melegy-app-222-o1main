import { NextRequest, NextResponse } from "next/server"
import { getConversations, updateConversationMessages, getUserConversations } from "@/lib/db"

export const runtime = "nodejs"

// GET /api/user/messages?conversation_id=CHAT%23...&user_id=mlg_xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationSK = searchParams.get("conversation_id")
    const userId = searchParams.get("user_id")

    if (!conversationSK || !userId) {
      return NextResponse.json({ error: "Missing conversation_id or user_id" }, { status: 400 })
    }

    const convs = await getConversations(userId, 200)
    const match = convs.find((c) => c.SK === conversationSK || c.id === conversationSK)

    if (!match) return NextResponse.json({ messages: [] })

    const messages = (match.messages ?? []).map((m: any, i: number) => ({
      id: String(i),
      role: m.role,
      content: m.content,
      media_urls: m.imageUrl
        ? [{ type: "image", url: m.imageUrl }]
        : m.videoUrl
        ? [{ type: "video", url: m.videoUrl }]
        : [],
      created_at: m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString(),
    }))

    return NextResponse.json({ messages })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/user/messages — append a message to a conversation
export async function POST(request: NextRequest) {
  try {
    const { conversation_id, mlg_user_id, role, content, imageUrl, videoUrl } = await request.json()

    if (!conversation_id || !mlg_user_id || !role || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Load existing messages
    const convs = await getConversations(mlg_user_id, 200)
    const match = convs.find((c) => c.SK === conversation_id || c.id === conversation_id)

    const existingMessages: any[] = match?.messages ?? []
    const newMsg = {
      role,
      content,
      timestamp: Date.now(),
      ...(imageUrl ? { imageUrl } : {}),
      ...(videoUrl ? { videoUrl } : {}),
    }
    const updated = [...existingMessages, newMsg]

    await updateConversationMessages(mlg_user_id, conversation_id, updated)

    return NextResponse.json({
      message: {
        id: String(updated.length - 1),
        role,
        content,
        created_at: new Date().toISOString(),
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

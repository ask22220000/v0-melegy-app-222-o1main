import { NextRequest, NextResponse } from "next/server"
import { getConversations, updateConversationMessages, incrementAnalytics } from "@/lib/db"

export const runtime = "nodejs"

/**
 * Messages are stored inline inside each conversation item in DynamoDB.
 * GET fetches a conversation's messages by user_id + conversation id.
 * POST appends a message to an existing conversation.
 */

// GET /api/user/messages?user_id=mlg_xxx&conversation_id=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")
    const conversationId = searchParams.get("conversation_id")

    if (!userId || !conversationId) {
      return NextResponse.json({ messages: [] })
    }

    const conversations = await getConversations(userId, 100)
    const conv = conversations.find((c) => c.id === conversationId)
    if (!conv) return NextResponse.json({ messages: [] })

    return NextResponse.json({ messages: conv.messages ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف"
    console.error("[user/messages] GET error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/user/messages — append message to conversation
export async function POST(request: NextRequest) {
  try {
    const { conversation_sk, mlg_user_id, role, content, imageUrl, videoUrl } = await request.json()

    if (!conversation_sk || !mlg_user_id || !role || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Fetch existing conversation
    const conversations = await getConversations(mlg_user_id, 100)
    const conv = conversations.find((c) => (c as any).SK === conversation_sk)
    if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

    const newMsg = {
      role: role as "user" | "assistant",
      content,
      timestamp: Date.now(),
      ...(imageUrl ? { imageUrl } : {}),
      ...(videoUrl ? { videoUrl } : {}),
    }

    const updatedMessages = [...(conv.messages ?? []), newMsg]
    await updateConversationMessages(mlg_user_id, conversation_sk, updatedMessages)

    if (role === "user") {
      incrementAnalytics("totalMessages").catch(() => {})
    }

    return NextResponse.json({ message: newMsg })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف"
    console.error("[user/messages] POST error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

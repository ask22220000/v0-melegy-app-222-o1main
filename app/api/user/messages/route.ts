import { NextRequest, NextResponse } from "next/server"
import { getServiceRoleClient } from "@/lib/supabase/server"

// GET /api/user/messages?conversation_id=xxx — fetch messages for a conversation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversation_id")

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversation_id" }, { status: 400 })
    }

    const supabase = getServiceRoleClient()

    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, role, content, media_urls, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/user/messages — save a message (preserves imageUrl, videoUrl)
export async function POST(request: NextRequest) {
  try {
    const { conversation_id, mlg_user_id, role, content, imageUrl, videoUrl } = await request.json()

    if (!conversation_id || !mlg_user_id || !role || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = getServiceRoleClient()

    // Build media_urls array to store any attached images/videos
    const media_urls: { type: string; url: string }[] = []
    if (imageUrl) media_urls.push({ type: "image", url: imageUrl })
    if (videoUrl) media_urls.push({ type: "video", url: videoUrl })

    // Save message — try with media_urls first, fallback without if column missing
    let data: any = null
    let error: any = null

    const insertPayload: any = {
      conversation_id,
      mlg_user_id,
      role,
      content,
      created_at: new Date().toISOString(),
    }
    if (media_urls.length > 0) insertPayload.media_urls = media_urls

    const result = await supabase
      .from("chat_messages")
      .insert(insertPayload)
      .select("id, role, content, media_urls, created_at")
      .single()

    data = result.data
    error = result.error

    // If media_urls column doesn't exist yet, retry without it
    if (error && error.message?.includes("media_urls")) {
      delete insertPayload.media_urls
      const fallback = await supabase
        .from("chat_messages")
        .insert(insertPayload)
        .select("id, role, content, created_at")
        .single()
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update conversation updated_at
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation_id)

    // Increment messages_used for user (only count user messages)
    if (role === "user") {
      await supabase.rpc("increment_messages_used", { user_id: mlg_user_id }).catch(() => {
        // fallback if rpc not available
      })
    }

    return NextResponse.json({ message: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getServiceRoleClient } from "@/lib/supabase/server"

// GET /api/user/messages?conversation_id=xxx
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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ messages: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/user/messages — save a message
export async function POST(request: NextRequest) {
  try {
    const { conversation_id, user_id, role, content, imageUrl, videoUrl } = await request.json()

    if (!conversation_id || !role || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = getServiceRoleClient()

    const media_urls: { type: string; url: string }[] = []
    if (imageUrl) media_urls.push({ type: "image", url: imageUrl })
    if (videoUrl) media_urls.push({ type: "video", url: videoUrl })

    const insertPayload: any = {
      conversation_id,
      role,
      content,
      created_at: new Date().toISOString(),
    }
    if (media_urls.length > 0) insertPayload.media_urls = media_urls

    const { data, error } = await supabase
      .from("chat_messages")
      .insert(insertPayload)
      .select("id, role, content, media_urls, created_at")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update melegy_history updated_at
    if (user_id) {
      await supabase
        .from("melegy_history")
        .update({ updated_at: new Date().toISOString() })
        .eq("auth_user_id", user_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .catch(() => {})
    }

    return NextResponse.json({ message: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

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
      .select("id, role, content, created_at")
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

// POST /api/user/messages — save a message
export async function POST(request: NextRequest) {
  try {
    const { conversation_id, mlg_user_id, role, content } = await request.json()

    if (!conversation_id || !mlg_user_id || !role || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = getServiceRoleClient()

    // Save message
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id,
        mlg_user_id,
        role,
        content,
        created_at: new Date().toISOString(),
      })
      .select("id, role, content, created_at")
      .single()

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

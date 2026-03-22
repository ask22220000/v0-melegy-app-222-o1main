import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, messages } = await request.json()

    if (!title || !messages) {
      return NextResponse.json(
        { error: "Title and messages required" },
        { status: 400 }
      )
    }

    // Create or update conversation
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        auth_user_id: user.id,
        title,
        started_at: new Date().toISOString(),
        message_count: messages.length,
      })
      .select()
      .single()

    if (error) throw error

    // Save messages
    const messageRecords = messages.map((msg: any) => ({
      conversation_id: data.id,
      role: msg.role,
      content: msg.content,
      message_type: msg.type || "text",
      created_at: new Date().toISOString(),
    }))

    const { error: messagesError } = await supabase
      .from("messages")
      .insert(messageRecords)

    if (messagesError) throw messagesError

    return NextResponse.json({
      conversationId: data.id,
      success: true,
    })
  } catch (error: any) {
    console.error("[save-conversation] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save conversation" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all conversations for this user
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("auth_user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ conversations })
  } catch (error: any) {
    console.error("[get-conversations] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch conversations" },
      { status: 500 }
    )
  }
}

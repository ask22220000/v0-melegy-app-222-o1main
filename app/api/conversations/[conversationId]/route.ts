import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const conversationId = params.conversationId

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("auth_user_id", user.id)
      .single()

    if (convError) throw convError

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (msgError) throw msgError

    return NextResponse.json({ conversation, messages })
  } catch (error: any) {
    console.error("[get-conversation] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch conversation" },
      { status: 500 }
    )
  }
}

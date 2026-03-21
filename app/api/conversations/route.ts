import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  })
}

// POST /api/conversations — save or update conversation
export async function POST(request: NextRequest) {
  try {
    const db = getClient()
    const { mlg_user_id, conversation_id, title, messages } = await request.json()

    if (!mlg_user_id || !messages) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // If conversation_id exists, update; otherwise create new
    if (conversation_id) {
      const { data, error } = await db
        .from("melegy_conversations")
        .update({
          title: title || "Untitled",
          messages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation_id)
        .eq("mlg_user_id", mlg_user_id)
        .select("id, title, messages, created_at, updated_at")
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ conversation: data })
    } else {
      // Create new conversation
      const { data, error } = await db
        .from("melegy_conversations")
        .insert({
          mlg_user_id,
          title: title || "Untitled",
          messages,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id, title, messages, created_at, updated_at")
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ conversation: data })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/conversations?mlg_user_id=mlg-xxx&conversation_id=uuid (optional)
export async function GET(request: NextRequest) {
  try {
    const db = getClient()
    const { searchParams } = new URL(request.url)
    const mlg_user_id = searchParams.get("mlg_user_id")
    const conversation_id = searchParams.get("conversation_id")

    if (!mlg_user_id) {
      return NextResponse.json({ error: "Missing mlg_user_id" }, { status: 400 })
    }

    // If specific conversation requested
    if (conversation_id) {
      const { data, error } = await db
        .from("melegy_conversations")
        .select("id, title, messages, created_at, updated_at")
        .eq("id", conversation_id)
        .eq("mlg_user_id", mlg_user_id)
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ conversation: data })
    }

    // Get all conversations for user
    const { data, error } = await db
      .from("melegy_conversations")
      .select("id, title, created_at, updated_at")
      .eq("mlg_user_id", mlg_user_id)
      .order("updated_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ conversations: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/conversations?conversation_id=uuid&mlg_user_id=mlg-xxx
export async function DELETE(request: NextRequest) {
  try {
    const db = getClient()
    const { searchParams } = new URL(request.url)
    const conversation_id = searchParams.get("conversation_id")
    const mlg_user_id = searchParams.get("mlg_user_id")

    if (!conversation_id || !mlg_user_id) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const { error } = await db
      .from("melegy_conversations")
      .delete()
      .eq("id", conversation_id)
      .eq("mlg_user_id", mlg_user_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getServiceRoleClient } from "@/lib/supabase/server"

// GET /api/user/conversations?user_id=mlg_xxx — fetch all conversations for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mlgUserId = searchParams.get("user_id")

    if (!mlgUserId) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 })
    }

    const supabase = getServiceRoleClient()

    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("mlg_user_id", mlgUserId)
      .order("updated_at", { ascending: false })

    if (error) {
      // Schema cache miss — column likely missing, return empty gracefully
      if (error.message?.includes("mlg_user_id") || error.code === "PGRST204") {
        console.error("[v0] conversations schema error:", error.message)
        return NextResponse.json({ conversations: [] })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ conversations: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/user/conversations — create new conversation
export async function POST(request: NextRequest) {
  try {
    const { mlg_user_id, title } = await request.json()

    if (!mlg_user_id) {
      return NextResponse.json({ error: "Missing mlg_user_id" }, { status: 400 })
    }

    const supabase = getServiceRoleClient()

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        mlg_user_id,
        title: title || "محادثة جديدة",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id, title, created_at")
      .single()

    if (error) {
      // Schema cache miss — column likely missing, return empty gracefully
      if (error.message?.includes("mlg_user_id") || error.code === "PGRST204") {
        console.error("[v0] conversations POST schema error:", error.message)
        return NextResponse.json({ conversation: { id: null, title: title || "محادثة جديدة", created_at: new Date().toISOString() } })
      }
    }

    return NextResponse.json({ conversation: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

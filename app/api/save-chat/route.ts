import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { chat_title, chat_date, messages } = await request.json()

    // Get user IP for identification
    const userIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    console.log("[v0] Saving chat:", { chat_title, chat_date, messagesCount: messages?.length, userIp })

    // Insert into melegy_history table
    const { data, error } = await supabase.from("melegy_history").insert({
      chat_title,
      chat_date,
      messages: JSON.stringify(messages), // Ensure messages is stringified for jsonb
      user_ip: userIp,
    })

    if (error) {
      console.error("[v0] Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Chat saved successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Save chat error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

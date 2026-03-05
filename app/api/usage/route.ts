import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getClient() {
  return createClient(supabaseUrl, supabaseKey)
}

function getUserIp(request: NextRequest | Request): string {
  const fwd =
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  return fwd
}

function todayDate(): string {
  return new Date().toISOString().split("T")[0]
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

// GET /api/usage — return today's usage row for the calling IP
export async function GET(request: NextRequest) {
  try {
    const ip = getUserIp(request)
    const today = todayDate()
    const month = currentMonth()
    const supabase = getClient()

    let { data, error } = await supabase
      .from("user_usage")
      .select("*")
      .eq("user_ip", ip)
      .eq("usage_date", today)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // No row yet — return zeroed defaults
    if (!data) {
      data = {
        user_ip: ip,
        usage_date: today,
        usage_month: month,
        messages: 0,
        images: 0,
        animated_videos: 0,
        voice_minutes: 0,
        monthly_words: 0,
        monthly_images: 0,
        theme: "dark",
        plan: "free",
      }
    }

    // If the stored month doesn't match current month, reset monthly counters
    if (data.usage_month !== month) {
      data.usage_month = month
      data.monthly_words = 0
      data.monthly_images = 0
    }

    return NextResponse.json({ usage: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/usage — upsert today's usage row
export async function POST(request: NextRequest) {
  try {
    const ip = getUserIp(request)
    const today = todayDate()
    const month = currentMonth()
    const supabase = getClient()
    const body = await request.json()

    const {
      messages,
      images,
      animated_videos,
      voice_minutes,
      monthly_words,
      monthly_images,
      theme,
      plan,
    } = body

    // Build only the fields that were provided
    const updates: Record<string, any> = {
      user_ip: ip,
      usage_date: today,
      usage_month: month,
      updated_at: new Date().toISOString(),
    }
    if (messages !== undefined)         updates.messages = messages
    if (images !== undefined)           updates.images = images
    if (animated_videos !== undefined)  updates.animated_videos = animated_videos
    if (voice_minutes !== undefined)    updates.voice_minutes = voice_minutes
    if (monthly_words !== undefined)    updates.monthly_words = monthly_words
    if (monthly_images !== undefined)   updates.monthly_images = monthly_images
    if (theme !== undefined)            updates.theme = theme
    if (plan !== undefined)             updates.plan = plan

    const { data, error } = await supabase
      .from("user_usage")
      .upsert(updates, { onConflict: "user_ip,usage_date" })
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ usage: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

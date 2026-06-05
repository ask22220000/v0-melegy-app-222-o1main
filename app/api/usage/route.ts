import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"

function getUserId(request: NextRequest | Request): string {
  const fwd =
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  return fwd
}

function todayEgypt(): string {
  const now = new Date()
  const offset = 2 * 60 * 60 * 1000
  return new Date(now.getTime() + offset).toISOString().split("T")[0]
}

function monthEgypt(): string {
  return todayEgypt().slice(0, 7)
}

// GET /api/usage?user_id=mlg_xxx  (or falls back to IP)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id") || getUserId(request)
    const today = todayEgypt()
    const month = monthEgypt()

    return NextResponse.json({
      usage: {
        user_ip: userId,
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
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/usage
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id") || getUserId(request)
    const today = todayEgypt()
    const body = await request.json()

    const { messages = 0, images = 0, animated_videos = 0, voice_minutes = 0, theme = "dark", plan = "free" } = body

    return NextResponse.json({
      usage: {
        user_ip: userId,
        usage_date: today,
        usage_month: monthEgypt(),
        messages,
        images,
        animated_videos,
        voice_minutes,
        monthly_words: 0,
        monthly_images: images,
        theme,
        plan,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

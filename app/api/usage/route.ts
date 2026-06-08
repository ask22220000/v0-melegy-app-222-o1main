import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  getDailyUsage,
  incrementDailyUsage,
  ensureUserMeta,
  getUserMeta,
  todayEgypt,
  monthEgypt,
} from "@/lib/db"

export const runtime = "nodejs"

function getUserId(request: NextRequest | Request): string {
  const fwd =
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  return fwd
}

// GET /api/usage?user_id=mlg_xxx  (or falls back to IP)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id") || getUserId(request)
    const today = todayEgypt()
    const month = monthEgypt()

    await ensureUserMeta(userId)
    const [usage, meta] = await Promise.all([
      getDailyUsage(userId, today),
      getUserMeta(userId),
    ])

    return NextResponse.json({
      usage: {
        user_ip: userId,
        usage_date: today,
        usage_month: month,
        messages: usage.messages,
        images: usage.images,
        animated_videos: usage.animated_videos,
        voice_minutes: usage.voice_minutes,
        monthly_words: 0,
        monthly_images: usage.images,
        theme: meta?.theme ?? "dark",
        plan: meta?.plan ?? "free",
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

    const { messages, images, animated_videos, voice_minutes, theme, plan } = body

    await ensureUserMeta(userId)

    const existing = await getDailyUsage(userId, today)

    // Only increment delta
    if (messages !== undefined && messages > existing.messages) {
      await incrementDailyUsage(userId, today, "messages", messages - existing.messages)
    }
    if (images !== undefined && images > existing.images) {
      await incrementDailyUsage(userId, today, "images", images - existing.images)
    }
    if (animated_videos !== undefined && animated_videos > existing.animated_videos) {
      await incrementDailyUsage(userId, today, "animated_videos", animated_videos - existing.animated_videos)
    }
    if (voice_minutes !== undefined && voice_minutes > existing.voice_minutes) {
      await incrementDailyUsage(userId, today, "voice_minutes", voice_minutes - existing.voice_minutes)
    }

    const updated = await getDailyUsage(userId, today)
    const meta = await getUserMeta(userId)

    return NextResponse.json({
      usage: {
        user_ip: userId,
        usage_date: today,
        usage_month: todayEgypt().slice(0, 7),
        messages: updated.messages,
        images: updated.images,
        animated_videos: updated.animated_videos,
        voice_minutes: updated.voice_minutes,
        monthly_words: 0,
        monthly_images: updated.images,
        theme: meta?.theme ?? "dark",
        plan: meta?.plan ?? "free",
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

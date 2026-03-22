import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  )
}

function getAuthToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  return authHeader.slice(7)
}

function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any
    return { userId: payload.userId }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = getAuthToken(req)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const auth = verifyToken(token)
    if (!auth) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = auth.userId

    // Get user data
    const supabase = getSupabaseClient()
    const { data: user, error: userError } = await supabase
      .from("melegy_users")
      .select("*")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get user's total conversations
    const { count: totalConversations } = await supabase
      .from("melegy_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    // Get user's messages today
    const today = new Date().toISOString().split("T")[0]
    const { count: messagesToday } = await supabase
      .from("melegy_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", `${today}T00:00:00Z`)

    // Get user's usage stats
    const { data: usageData } = await supabase
      .from("user_usage")
      .select("*")
      .eq("user_id", userId)

    const totalImages = usageData?.reduce((sum, r) => sum + (Number(r.images) || 0), 0) || 0
    const totalVideos = usageData?.reduce((sum, r) => sum + (Number(r.animated_videos) || 0), 0) || 0
    const totalVoiceMinutes = usageData?.reduce((sum, r) => sum + (Number(r.voice_minutes) || 0), 0) || 0

    // Get hourly activity (last 24 hours)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: hourlyRows } = await supabase
      .from("melegy_history")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", since24h)

    const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({ hour: i, messages: 0 }))
    ;(hourlyRows ?? []).forEach((r: any) => {
      if (r.created_at) {
        const h = new Date(r.created_at).getHours()
        hourlyActivity[h].messages++
      }
    })

    // Get daily activity (last 14 days)
    const since14d = new Date(Date.now() - 14 * 86400000).toISOString()
    const { data: dailyRows } = await supabase
      .from("melegy_history")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", since14d)

    const dayMap: Record<string, number> = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0]
      dayMap[d] = 0
    }
    ;(dailyRows ?? []).forEach((r: any) => {
      if (r.created_at) {
        const d = (r.created_at as string).split("T")[0]
        if (dayMap[d] !== undefined) dayMap[d]++
      }
    })
    const dailyActivity = Object.entries(dayMap).map(([date, conversations]) => ({ date, conversations }))

    return NextResponse.json({
      user: {
        email: user.email,
        plan: user.plan,
        createdAt: user.created_at,
        lastLogin: user.last_login,
      },
      stats: {
        totalConversations: totalConversations || 0,
        messagesToday: messagesToday || 0,
        totalImages,
        totalVideos,
        totalVoiceMinutes,
      },
      hourlyActivity,
      dailyActivity,
      lastUpdated: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[v0] User analytics error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { getServiceRoleClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = getServiceRoleClient()

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
  }

  let totalConversations = 0
  let totalUsers = 0
  let totalMessages = 0
  let totalImages = 0
  let totalVideos = 0
  let totalAudioMinutes = 0
  let subscriptionsByPlan = { free: 0, starter: 0, pro: 0, advanced: 0 }
  let totalSubscribers = 0
  let activeSubscriptions: any[] = []
  let userList: any[] = []

  try {
    const { count } = await supabase
      .from("melegy_history")
      .select("*", { count: "exact", head: true })
    totalConversations = count || 0
  } catch (_) {}

  try {
    const { data } = await supabase
      .from("melegy_history")
      .select("auth_user_id")
    const uniqueUsers = new Set(
      (data || []).map((r: any) => r.auth_user_id).filter(Boolean)
    )
    totalUsers = uniqueUsers.size
  } catch (_) {}

  try {
    const { data } = await supabase
      .from("feature_usage")
      .select("messages_used, images_used, videos_used, audio_minutes_used, user_id")
    for (const row of data || []) {
      totalMessages += row.messages_used || 0
      totalImages += row.images_used || 0
      totalVideos += row.videos_used || 0
      totalAudioMinutes += row.audio_minutes_used || 0
    }
    userList = (data || []).map((r: any) => ({
      user_ip: r.user_id || "",
      messages: r.messages_used || 0,
      images: r.images_used || 0,
      videos: r.videos_used || 0,
      audioMinutes: r.audio_minutes_used || 0,
      plan: "free",
      lastActive: new Date().toISOString(),
    }))
  } catch (_) {}

  try {
    const { data } = await supabase
      .from("subscriptions")
      .select("user_ip, auth_user_id, plan_name, status, started_at, expires_at")
      .order("created_at", { ascending: false })

    activeSubscriptions = (data || []).map((r: any) => ({
      user_ip: r.user_ip || "",
      user_email: "",
      plan_name: r.plan_name || "free",
      status: r.status || "unknown",
      started_at: r.started_at || "",
      expires_at: r.expires_at || "",
    }))

    const planMap: Record<string, Set<string>> = {
      free: new Set(),
      starter: new Set(),
      pro: new Set(),
      advanced: new Set(),
    }
    for (const r of data || []) {
      if (r.status !== "active") continue
      const p = (r.plan_name || "free").toLowerCase()
      const userId = r.auth_user_id || r.user_ip || "unknown"
      if (planMap[p]) planMap[p].add(userId)
      else planMap["free"].add(userId)
    }
    subscriptionsByPlan = {
      free: planMap.free.size,
      starter: planMap.starter.size,
      pro: planMap.pro.size,
      advanced: planMap.advanced.size,
    }
    totalSubscribers = activeSubscriptions.length
  } catch (_) {}

  return NextResponse.json({
    totalConversations,
    totalUsers,
    totalMessages,
    totalImages,
    totalVideos,
    totalAudioMinutes,
    subscriptionsByPlan,
    totalSubscribers,
    activeSubscriptions,
    userList,
  })
}

export async function POST(request: Request) {
  const supabase = getServiceRoleClient()
  if (!supabase) return NextResponse.json({ success: false })
  try {
    const body = await request.json()
    const { user_ip, auth_user_id, event_type, metadata } = body
    await supabase.from("analytics_events").insert({
      user_ip: user_ip || null,
      auth_user_id: auth_user_id || null,
      event_type,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    })
    return NextResponse.json({ success: true })
  } catch (_) {
    return NextResponse.json({ success: false })
  }
}

// Analytics API v2 - Clean rebuild
import { getServiceRoleClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = getServiceRoleClient()

  let totalConversations = 0
  let uniqueUsers = 0
  let recentUsers24h = 0
  let hourlyFromDB: { hour: number; messages: number }[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, messages: 0 }))
  let topQueries: { query: string; count: number }[] = []
  let dailyActivity: { date: string; conversations: number }[] = []

  try {
    const { count: convCount } = await supabase
      .from("melegy_history")
      .select("*", { count: "exact", head: true })
    totalConversations = convCount || 0
  } catch {}

  try {
    const { data: userRows } = await supabase
      .from("melegy_history")
      .select("auth_user_id")
      .not("auth_user_id", "is", null)
    const uniqueIds = new Set((userRows ?? []).map((r: any) => r.auth_user_id).filter(Boolean))
    uniqueUsers = uniqueIds.size
  } catch {}

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentRows } = await supabase
      .from("melegy_history")
      .select("auth_user_id")
      .gte("created_at", since)
      .not("auth_user_id", "is", null)
    const recent24Set = new Set((recentRows ?? []).map((r: any) => r.auth_user_id).filter(Boolean))
    recentUsers24h = recent24Set.size
  } catch {}

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: hourRows } = await supabase
      .from("melegy_history")
      .select("created_at")
      .gte("created_at", since)
    hourlyFromDB = Array.from({ length: 24 }, (_, i) => ({ hour: i, messages: 0 }))
    ;(hourRows ?? []).forEach((r: any) => {
      if (r.created_at) {
        const h = new Date(r.created_at).getHours()
        hourlyFromDB[h].messages++
      }
    })
  } catch {}

  try {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: titleRows } = await supabase
      .from("melegy_history")
      .select("chat_title")
      .gte("created_at", since7d)
      .not("chat_title", "is", null)
      .limit(500)
    const freq: Record<string, number> = {}
    ;(titleRows ?? []).forEach((r: any) => {
      if (r.chat_title) {
        const k = (r.chat_title as string).trim().substring(0, 60)
        if (k.length > 2) freq[k] = (freq[k] || 0) + 1
      }
    })
    topQueries = Object.entries(freq)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  } catch {}

  try {
    const { data: dailyRows } = await supabase
      .from("melegy_history")
      .select("created_at")
      .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())

    const dayMap: Record<string, number> = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0]
      dayMap[d] = 0
    }
    for (const r of dailyRows ?? []) {
      const d = (r.created_at as string).split("T")[0]
      if (dayMap[d] !== undefined) dayMap[d]++
    }
    dailyActivity = Object.entries(dayMap).map(([date, conversations]) => ({ date, conversations }))
  } catch {}

  let totalImages = 0
  let totalVideos = 0
  let totalVoiceMinutes = 0
  let messagesToday = 0
  let monthlyMessages = 0
  let monthlyImages = 0

  try {
    const today = new Date().toISOString().split("T")[0]
    const month = new Date().toISOString().slice(0, 7)

    const { data: usageRows } = await supabase
      .from("user_usage")
      .select("*")
      .order("updated_at", { ascending: false })

    const rows = usageRows ?? []
    totalImages = rows.reduce((s, r) => s + (Number(r.images) || 0), 0)
    totalVideos = rows.reduce((s, r) => s + (Number(r.animated_videos) || 0), 0)
    totalVoiceMinutes = rows.reduce((s, r) => s + (Number(r.voice_minutes) || 0), 0)

    messagesToday = rows
      .filter((r) => r.usage_date === today)
      .reduce((s, r) => s + (Number(r.messages) || 0), 0)

    const monthlyRows = rows.filter((r) => r.usage_month === month)
    monthlyMessages = monthlyRows.reduce((s, r) => s + (Number(r.messages) || 0), 0)
    monthlyImages = monthlyRows.reduce((s, r) => s + (Number(r.images) || 0), 0)
  } catch {}

  let subscriptionsByPlan = { free: 0, starter: 0, pro: 0, advanced: 0 }
  let totalSubscribers = 0

  try {
    const { data: subRows } = await supabase
      .from("subscriptions")
      .select("auth_user_id, plan_name, status")
      .eq("status", "active")

    const rows = subRows ?? []
    const planMap: Record<string, Set<string>> = {
      free: new Set(), starter: new Set(), pro: new Set(), advanced: new Set(),
    }
    for (const r of rows) {
      const p = (r.plan_name ?? "free").toLowerCase()
      const userId = r.auth_user_id ?? "unknown"
      if (planMap[p]) planMap[p].add(userId)
      else planMap["free"].add(userId)
    }
    subscriptionsByPlan = {
      free: planMap.free.size,
      starter: planMap.starter.size,
      pro: planMap.pro.size,
      advanced: planMap.advanced.size,
    }
    totalSubscribers = rows.length
  } catch {}

  const featureUsageCounts = {
    textGeneration: totalConversations,
    imageGeneration: totalImages,
    videoGeneration: totalVideos,
    deepSearch: 0,
    ideaToPrompt: 0,
    voiceCloning: Math.round(totalVoiceMinutes),
  }

  const lastHourMessages = hourlyFromDB[new Date().getHours()]?.messages || 0
  const messagesPerMinute = Number((lastHourMessages / 60).toFixed(2))

  return Response.json({
    totalConversations,
    totalMessages: totalConversations,
    totalUsers: uniqueUsers,
    activeUsersNow: recentUsers24h,
    activeUsers: recentUsers24h,
    pageviewsToday: 0,
    visitorsToday: 0,
    messagesPerMinute,
    averageResponseTime: 0,
    subscriptionsByPlan,
    totalSubscribers,
    featureUsage: featureUsageCounts,
    totalImages,
    totalVideos,
    totalVoiceMinutes: Math.round(totalVoiceMinutes),
    messagesToday,
    conversationsToday: recentUsers24h,
    monthlyMessages,
    monthlyImages,
    dailyActivity,
    hourlyActivity: hourlyFromDB,
    responseTypes: { text: totalConversations, search: 0, creative: 0, technical: 0 },
    userSatisfaction: { positive: 0, neutral: 0, negative: 0 },
    systemHealth: { apiResponseTime: 0, uptime: 99.9, errorRate: 0 },
    topQueries,
    lastUpdated: new Date().toISOString(),
  })
}

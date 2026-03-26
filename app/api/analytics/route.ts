import { getServiceRoleClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

// ── Vercel Analytics REST API helper ─────────────────────────────────────────
async function fetchVercelAnalytics() {
  const token     = process.env.VERCEL_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID || process.env.NEXT_PUBLIC_VERCEL_PROJECT_ID
  const teamId    = process.env.VERCEL_TEAM_ID

  if (!token || !projectId) {
    return { pageviews: 0, visitors: 0, hourlyActivity: [] as { hour: number; messages: number }[] }
  }

  const now  = Date.now()
  const day  = 24 * 60 * 60 * 1000
  const from = new Date(now - day).toISOString()
  const to   = new Date(now).toISOString()

  const base    = `https://api.vercel.com/v1/web/projects/${projectId}/analytics`
  const teamQ   = teamId ? `&teamId=${teamId}` : ""
  const headers = { Authorization: `Bearer ${token}` }

  let pageviews = 0
  let visitors  = 0
  let hourlyActivity: { hour: number; messages: number }[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, messages: 0 }))

  try {
    const pvRes = await fetch(`${base}/pageviews?from=${from}&to=${to}&limit=1000${teamQ}`, { headers, next: { revalidate: 60 } })
    if (pvRes.ok) {
      const pvData = await pvRes.json()
      const rows: any[] = pvData?.data ?? pvData?.pageviews ?? []
      rows.forEach((r: any) => {
        pageviews += Number(r.pageviews ?? r.count ?? r.value ?? 0)
        visitors  += Number(r.visitors  ?? r.unique  ?? 0)
        const ts   = r.timestamp ? new Date(r.timestamp) : null
        if (ts) hourlyActivity[ts.getHours()].messages += Number(r.pageviews ?? r.count ?? 0)
      })
      if (rows.length === 0) {
        pageviews = Number(pvData?.total?.pageviews ?? pvData?.pageviews ?? 0)
        visitors  = Number(pvData?.total?.visitors  ?? pvData?.visitors  ?? 0)
      }
    }
  } catch { /* ignore */ }

  return { pageviews, visitors, hourlyActivity }
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  const supabase = getServiceRoleClient()

  // 1. melegy_history stats
  let totalConversations = 0
  let uniqueUsers        = 0
  let recentUsers24h     = 0
  let hourlyFromDB: { hour: number; messages: number }[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, messages: 0 }))
  let topQueries: { query: string; count: number }[]     = []

  try {
    const { count } = await supabase.from("melegy_history").select("*", { count: "exact", head: true })
    totalConversations = count || 0
  } catch { /* ignore */ }

  try {
    const { data } = await supabase.from("melegy_history").select("mlg_user_id").not("mlg_user_id", "is", null)
    uniqueUsers = new Set((data ?? []).map((r: any) => r.mlg_user_id)).size
  } catch { /* ignore */ }

  try {
    const since = new Date(Date.now() - 86400000).toISOString()
    const { data } = await supabase.from("melegy_history").select("mlg_user_id").gte("created_at", since).not("mlg_user_id", "is", null)
    recentUsers24h = new Set((data ?? []).map((r: any) => r.mlg_user_id)).size
  } catch { /* ignore */ }

  try {
    const since = new Date(Date.now() - 86400000).toISOString()
    const { data } = await supabase.from("melegy_history").select("created_at").gte("created_at", since)
    hourlyFromDB = Array.from({ length: 24 }, (_, i) => ({ hour: i, messages: 0 }))
    ;(data ?? []).forEach((r: any) => { hourlyFromDB[new Date(r.created_at).getHours()].messages++ })
  } catch { /* ignore */ }

  try {
    const since7d = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data } = await supabase.from("melegy_history").select("chat_title").gte("created_at", since7d).not("chat_title", "is", null).limit(500)
    const freq: Record<string, number> = {}
    ;(data ?? []).forEach((r: any) => {
      const k = (r.chat_title as string).trim().substring(0, 60)
      if (k.length > 2) freq[k] = (freq[k] || 0) + 1
    })
    topQueries = Object.entries(freq).map(([query, count]) => ({ query, count })).sort((a, b) => b.count - a.count).slice(0, 10)
  } catch { /* ignore */ }

  // 2. user_usage stats
  let totalImages = 0, totalVideos = 0, totalVoiceMinutes = 0
  let messagesToday = 0, monthlyMessages = 0, monthlyImages = 0
  let totalSubscribers = 0
  let subscriptionsByPlan = { free: 0, starter: 0, pro: 0, advanced: 0 }
  let dailyActivity: { date: string; conversations: number }[] = []

  try {
    const today = new Date().toISOString().split("T")[0]
    const month = new Date().toISOString().slice(0, 7)
    const { data: rows } = await supabase.from("user_usage").select("*")
    const usageRows = rows ?? []

    totalImages       = usageRows.reduce((s, r) => s + (r.images ?? 0), 0)
    totalVideos       = usageRows.reduce((s, r) => s + (r.animated_videos ?? 0), 0)
    totalVoiceMinutes = usageRows.reduce((s, r) => s + (r.voice_minutes ?? 0), 0)
    messagesToday     = usageRows.filter(r => r.usage_date === today).reduce((s, r) => s + (r.messages ?? 0), 0)
    const monthly     = usageRows.filter(r => r.usage_month === month)
    monthlyMessages   = monthly.reduce((s, r) => s + (r.messages ?? 0), 0)
    monthlyImages     = monthly.reduce((s, r) => s + (r.images ?? 0), 0)

    const planMap: Record<string, Set<string>> = { free: new Set(), starter: new Set(), pro: new Set(), advanced: new Set() }
    for (const r of usageRows) {
      const p = (r.plan ?? "free") as string
      if (planMap[p]) planMap[p].add(r.user_ip); else planMap["free"].add(r.user_ip)
    }
    subscriptionsByPlan = { free: planMap.free.size, starter: planMap.starter.size, pro: planMap.pro.size, advanced: planMap.advanced.size }
    totalSubscribers    = Object.values(subscriptionsByPlan).reduce((a, b) => a + b, 0)

    const { data: dailyRows } = await supabase.from("melegy_history").select("created_at").gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())
    const dayMap: Record<string, number> = {}
    for (let i = 13; i >= 0; i--) dayMap[new Date(Date.now() - i * 86400000).toISOString().split("T")[0]] = 0
    for (const r of dailyRows ?? []) { const d = (r.created_at as string).split("T")[0]; if (dayMap[d] !== undefined) dayMap[d]++ }
    dailyActivity = Object.entries(dayMap).map(([date, conversations]) => ({ date, conversations }))
  } catch (e: any) {
    console.error("[analytics] user_usage error:", e.message)
  }

  // 3. Vercel Analytics
  const vercel = process.env.VERCEL_TOKEN
    ? await fetchVercelAnalytics()
    : { pageviews: 0, visitors: 0, hourlyActivity: [] as { hour: number; messages: number }[] }

  const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    messages: (vercel.hourlyActivity[i]?.messages || 0) + (hourlyFromDB[i]?.messages || 0),
  }))

  return Response.json({
    totalConversations, totalMessages: totalConversations, totalUsers: uniqueUsers,
    activeUsersNow: recentUsers24h, activeUsers: recentUsers24h,
    pageviewsToday: vercel.pageviews, visitorsToday: vercel.visitors,
    messagesPerMinute: Number((hourlyActivity[new Date().getHours()]?.messages / 60).toFixed(2)),
    averageResponseTime: 0,
    subscriptionsByPlan, totalSubscribers,
    featureUsage: { textGeneration: totalConversations, imageGeneration: totalImages, videoGeneration: totalVideos, deepSearch: 0, ideaToPrompt: 0, voiceCloning: Math.round(totalVoiceMinutes) },
    totalImages, totalVideos, totalVoiceMinutes: Math.round(totalVoiceMinutes),
    messagesToday, conversationsToday: recentUsers24h, monthlyMessages, monthlyImages,
    dailyActivity, responseTypes: { text: totalConversations, search: 0, creative: 0, technical: 0 },
    userSatisfaction: { positive: 0, neutral: 0, negative: 0 },
    systemHealth: { apiResponseTime: 0, uptime: 99.9, errorRate: 0 },
    topQueries, hourlyActivity, lastUpdated: new Date().toISOString(),
  })
}

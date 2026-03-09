import { getServiceRoleClient } from "@/lib/supabase/server"

// ── Vercel Analytics REST API helper ─────────────────────────────────────────
// Docs: https://vercel.com/docs/rest-api/endpoints#get-web-analytics-events
async function fetchVercelAnalytics() {
  const token     = process.env.VERCEL_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID || process.env.NEXT_PUBLIC_VERCEL_PROJECT_ID
  const teamId    = process.env.VERCEL_TEAM_ID

  if (!token || !projectId) {
    return { pageviews: 0, visitors: 0, hourlyActivity: [] as { hour: number; messages: number }[] }
  }

  const now   = Date.now()
  const day   = 24 * 60 * 60 * 1000
  const from  = new Date(now - day).toISOString()
  const to    = new Date(now).toISOString()

  const base = `https://api.vercel.com/v1/web/projects/${projectId}/analytics`
  const teamQ = teamId ? `&teamId=${teamId}` : ""
  const headers = { Authorization: `Bearer ${token}` }

  // Page views (last 24 h)
  let pageviews = 0
  let visitors  = 0
  let hourlyActivity: { hour: number; messages: number }[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, messages: 0 }))

  try {
    const pvRes = await fetch(
      `${base}/pageviews?from=${from}&to=${to}&limit=1000${teamQ}`,
      { headers, next: { revalidate: 60 } }
    )
    if (pvRes.ok) {
      const pvData = await pvRes.json()
      // shape: { data: [ { timestamp, pageviews, visitors } ] } or { total, data }
      const rows: any[] = pvData?.data ?? pvData?.pageviews ?? []
      rows.forEach((r: any) => {
        const pv = Number(r.pageviews ?? r.count ?? r.value ?? 0)
        const vis = Number(r.visitors ?? r.unique ?? 0)
        pageviews += pv
        visitors  += vis
        // fill hourly bucket
        const ts = r.timestamp ? new Date(r.timestamp) : null
        if (ts) {
          const h = ts.getHours()
          hourlyActivity[h].messages += pv
        }
      })
      // fallback: single summary object
      if (rows.length === 0) {
        pageviews = Number(pvData?.total?.pageviews ?? pvData?.pageviews ?? 0)
        visitors  = Number(pvData?.total?.visitors  ?? pvData?.visitors  ?? 0)
      }
    }
  } catch { /* ignore */ }

  return { pageviews, visitors, hourlyActivity }
}

// ── Vercel token env-var check helper ────────────────────────────────────────
function hasVercelToken() {
  return !!(process.env.VERCEL_TOKEN)
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  const supabase = getServiceRoleClient()

  // ── 1. melegy_history stats (real, always available) ─────────────────────
  let totalConversations = 0
  let uniqueUsers        = 0
  let recentUsers24h     = 0
  let hourlyFromDB: { hour: number; messages: number }[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, messages: 0 }))
  let topQueries: { query: string; count: number }[]     = []

  try {
    // Total saved conversations
    const { count: convCount } = await supabase
      .from("melegy_history")
      .select("*", { count: "exact", head: true })
    totalConversations = convCount || 0
  } catch { /* ignore */ }

  try {
    // Unique users (by mlg_user_id)
    const { data: userRows } = await supabase
      .from("melegy_history")
      .select("mlg_user_id")
      .not("mlg_user_id", "is", null)
    const uniqueIds = new Set((userRows ?? []).map((r: any) => r.mlg_user_id))
    uniqueUsers = uniqueIds.size
  } catch { /* ignore */ }

  try {
    // Active in last 24 h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentRows } = await supabase
      .from("melegy_history")
      .select("mlg_user_id")
      .gte("created_at", since)
      .not("mlg_user_id", "is", null)
    const recent24Set = new Set((recentRows ?? []).map((r: any) => r.mlg_user_id))
    recentUsers24h = recent24Set.size
  } catch { /* ignore */ }

  try {
    // Hourly activity (created_at in last 24 h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: hourRows } = await supabase
      .from("melegy_history")
      .select("created_at")
      .gte("created_at", since)
    hourlyFromDB = Array.from({ length: 24 }, (_, i) => ({ hour: i, messages: 0 }))
    ;(hourRows ?? []).forEach((r: any) => {
      const h = new Date(r.created_at).getHours()
      hourlyFromDB[h].messages++
    })
  } catch { /* ignore */ }

  try {
    // Top queries from chat titles (proxy for what users asked)
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: titleRows } = await supabase
      .from("melegy_history")
      .select("chat_title")
      .gte("created_at", since7d)
      .not("chat_title", "is", null)
      .limit(500)
    const freq: Record<string, number> = {}
    ;(titleRows ?? []).forEach((r: any) => {
      const k = (r.chat_title as string).trim().substring(0, 60)
      if (k.length > 2) freq[k] = (freq[k] || 0) + 1
    })
    topQueries = Object.entries(freq)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  } catch { /* ignore */ }

  // ── 2. user_usage stats ───────────────────────────────────────────────────
  let totalImages = 0
  let totalVideos = 0
  let totalVoiceMinutes = 0
  let messagesToday = 0
  let monthlyMessages = 0
  let monthlyImages = 0
  let totalSubscribers = 0
  let subscriptionsByPlan = { free: 0, starter: 0, pro: 0, advanced: 0 }
  let dailyActivity: { date: string; conversations: number }[] = []

  try {
    const today = new Date().toISOString().split("T")[0]
    const month = new Date().toISOString().slice(0, 7)

    const { data: usageRows } = await supabase
      .from("user_usage")
      .select("*")

    const rows = usageRows ?? []

    totalImages       = rows.reduce((s, r) => s + (r.images ?? 0), 0)
    totalVideos       = rows.reduce((s, r) => s + (r.animated_videos ?? 0), 0)
    totalVoiceMinutes = rows.reduce((s, r) => s + (r.voice_minutes ?? 0), 0)

    // Today's messages from user_usage
    messagesToday = rows
      .filter((r) => r.usage_date === today)
      .reduce((s, r) => s + (r.messages ?? 0), 0)

    // Monthly totals
    const monthlyRows = rows.filter((r) => r.usage_month === month)
    monthlyMessages = monthlyRows.reduce((s, r) => s + (r.messages ?? 0), 0)
    monthlyImages   = monthlyRows.reduce((s, r) => s + (r.images ?? 0), 0)

    // Plan distribution (unique IPs per plan)
    const planMap: Record<string, Set<string>> = {
      free: new Set(), starter: new Set(), pro: new Set(), advanced: new Set(),
    }
    for (const r of rows) {
      const p = (r.plan ?? "free") as string
      if (planMap[p]) planMap[p].add(r.user_ip)
      else planMap["free"].add(r.user_ip)
    }
    subscriptionsByPlan = {
      free:     planMap.free.size,
      starter:  planMap.starter.size,
      pro:      planMap.pro.size,
      advanced: planMap.advanced.size,
    }
    totalSubscribers = Object.values(subscriptionsByPlan).reduce((a, b) => a + b, 0)

    // Daily activity (last 14 days) — from melegy_history created_at
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
  } catch (e: any) {
    console.error("[v0] user_usage analytics error:", e.message)
  }

  // ── 3. Vercel Analytics (page views / visitors) ───────────────────────────
  const vercel = hasVercelToken()
    ? await fetchVercelAnalytics()
    : { pageviews: 0, visitors: 0, hourlyActivity: [] as { hour: number; messages: number }[] }

  // Merge hourly: prefer Vercel data (has page views) on top of DB saves
  const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    messages: (vercel.hourlyActivity[i]?.messages || 0) + (hourlyFromDB[i]?.messages || 0),
  }))

  const lastHourMessages = hourlyActivity[new Date().getHours()]?.messages || 0
  const messagesPerMinute = Number((lastHourMessages / 60).toFixed(2))

  // ── 3. Build response ─────────────────────────────────────────────────────
  return Response.json({
    // Real numbers from DB
    totalConversations,
    totalMessages:     totalConversations, // best proxy we have
    totalUsers:        uniqueUsers,
    activeUsersNow:    recentUsers24h,
    activeUsers:       recentUsers24h,

    // From Vercel Analytics (0 if no token)
    pageviewsToday:    vercel.pageviews,
    visitorsToday:     vercel.visitors,

    // Derived
    messagesPerMinute,
    averageResponseTime: 0,

    // Plan distribution + feature usage from user_usage table
    subscriptionsByPlan,
    totalSubscribers,

    featureUsage: {
      textGeneration: totalConversations,
      imageGeneration: totalImages,
      videoGeneration: totalVideos,
      deepSearch: 0,
      ideaToPrompt: 0,
      voiceCloning: Math.round(totalVoiceMinutes),
    },

    // totals
    totalImages,
    totalVideos,
    totalVoiceMinutes: Math.round(totalVoiceMinutes),
    messagesToday,
    conversationsToday: recentUsers24h,

    // monthly
    monthlyMessages,
    monthlyImages,

    // daily chart (last 14 days)
    dailyActivity,

    responseTypes: { text: totalConversations, search: 0, creative: 0, technical: 0 },
    userSatisfaction: { positive: 0, neutral: 0, negative: 0 },

    systemHealth: {
      apiResponseTime: 0,
      uptime: 99.9,
      errorRate: 0,
    },

    topQueries,
    hourlyActivity,
    lastUpdated: new Date().toISOString(),
  })
}

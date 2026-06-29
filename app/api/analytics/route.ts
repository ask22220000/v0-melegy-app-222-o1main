import { getAnalytics, scanAllUsers, scanRecentChats, todayEgypt } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ── Vercel Analytics REST API helper ─────────────────────────────────────────
async function fetchVercelAnalytics() {
  const token     = process.env.VERCEL_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID || process.env.NEXT_PUBLIC_VERCEL_PROJECT_ID
  const teamId    = process.env.VERCEL_TEAM_ID

  if (!token || !projectId) {
    return { pageviews: 0, visitors: 0, hourlyActivity: [] as { hour: number; messages: number }[] }
  }

  const now  = Date.now()
  const from = new Date(now - 86400000).toISOString()
  const to   = new Date(now).toISOString()
  const base = `https://api.vercel.com/v1/web/projects/${projectId}/analytics`
  const teamQ = teamId ? `&teamId=${teamId}` : ""
  const headers = { Authorization: `Bearer ${token}` }

  let pageviews = 0
  let visitors  = 0
  const hourlyActivity: { hour: number; messages: number }[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, messages: 0 }))

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
  try {
    // 1. Global analytics counters from DynamoDB
    const [globalStats, allUsers, recentChats] = await Promise.all([
      getAnalytics(),
      scanAllUsers(),
      scanRecentChats(14),
    ])

    const totalUsers     = allUsers.length || globalStats.totalUsers
    const now            = Date.now()
    const since24h       = now - 86400000
    const today          = todayEgypt()

    // Active users: updated in the last 24h
    const recentUsers24h = allUsers.filter(
      u => u.updatedAt && new Date(u.updatedAt).getTime() > since24h
    ).length

    // ── Plan counts from real user records ───────────────────────────────────
    // Plan names stored in DB: "free", "starter", "pro", "vip" / "advanced"
    const subscriptionsByPlan = {
      free:     allUsers.filter(u => !u.plan || u.plan === "free").length,
      starter:  allUsers.filter(u => u.plan === "starter" || u.plan === "startup").length,
      pro:      allUsers.filter(u => u.plan === "pro").length,
      advanced: allUsers.filter(u => u.plan === "advanced" || u.plan === "vip").length,
    }
    const totalSubscribers = subscriptionsByPlan.free + subscriptionsByPlan.starter +
      subscriptionsByPlan.pro + subscriptionsByPlan.advanced

    // ── Hourly & daily activity from recent chats ────────────────────────────
    const hourlyFromDB: { hour: number; messages: number }[] =
      Array.from({ length: 24 }, (_, i) => ({ hour: i, messages: 0 }))

    const dayMap: Record<string, number> = {}
    for (let i = 13; i >= 0; i--) {
      dayMap[new Date(now - i * 86400000).toISOString().slice(0, 10)] = 0
    }

    let conversationsToday = 0
    recentChats.forEach(c => {
      const d = (c.createdAt ?? "").slice(0, 10)
      if (dayMap[d] !== undefined) dayMap[d]++
      if (d === today) conversationsToday++
      const h = new Date(c.createdAt ?? "").getHours()
      if (h >= 0 && h < 24) hourlyFromDB[h].messages++
    })

    const dailyActivity = Object.entries(dayMap).map(([date, conversations]) => ({ date, conversations }))

    // Total conversations = all CHAT items ever stored (from global scan)
    const totalConversations = globalStats.totalChats || recentChats.length

    // ── Messages today: sum of hourly from chats created today ───────────────
    const messagesToday = recentChats.filter(c => (c.createdAt ?? "").slice(0, 10) === today).length

    // ── Top queries from recent chat titles ──────────────────────────────────
    const freq: Record<string, number> = {}
    recentChats.forEach(c => {
      const k = (c.title ?? "").trim().substring(0, 60)
      if (k.length > 2) freq[k] = (freq[k] || 0) + 1
    })
    const topQueries = Object.entries(freq)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 2. Vercel Analytics (optional)
    const vercel = process.env.VERCEL_TOKEN
      ? await fetchVercelAnalytics()
      : { pageviews: 0, visitors: 0, hourlyActivity: [] as { hour: number; messages: number }[] }

    const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      messages: (vercel.hourlyActivity[i]?.messages || 0) + (hourlyFromDB[i]?.messages || 0),
    }))

    return Response.json({
      // Core counts
      totalUsers,
      totalConversations,
      totalMessages:      globalStats.totalMessages,
      totalImages:        globalStats.totalImages,
      totalVideos:        globalStats.totalVideos,
      totalVoiceMinutes:  Math.round(globalStats.totalVoiceMinutes),

      // Active / today
      activeUsersNow:     recentUsers24h,
      activeUsers:        recentUsers24h,
      messagesToday,
      conversationsToday,
      monthlyMessages:    globalStats.totalMessages,
      monthlyImages:      globalStats.totalImages,

      // Subscriptions
      subscriptionsByPlan,
      totalSubscribers,

      // Feature usage
      featureUsage: {
        textGeneration:  globalStats.totalMessages,
        imageGeneration: globalStats.totalImages,
        videoGeneration: globalStats.totalVideos,
        deepSearch:      0,
        ideaToPrompt:    0,
        voiceCloning:    Math.round(globalStats.totalVoiceMinutes),
      },

      // Vercel Analytics
      pageviewsToday:     vercel.pageviews,
      visitorsToday:      vercel.visitors,

      // Misc
      messagesPerMinute:   Number((hourlyActivity[new Date().getHours()]?.messages / 60).toFixed(2)),
      averageResponseTime: 0,

      // Charts
      dailyActivity,
      topQueries,
      hourlyActivity,

      // Sentiment / health (static — no data source yet)
      responseTypes:    { text: globalStats.totalMessages, search: 0, creative: 0, technical: 0 },
      userSatisfaction: { positive: 0, neutral: 0, negative: 0 },
      systemHealth:     { apiResponseTime: 0, uptime: 99.9, errorRate: 0 },

      lastUpdated: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error("[analytics] error:", e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

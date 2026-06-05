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
    const vercel = process.env.VERCEL_TOKEN
      ? await fetchVercelAnalytics()
      : { pageviews: 0, visitors: 0, hourlyActivity: [] as { hour: number; messages: number }[] }

    const now = Date.now()
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      messages: vercel.hourlyActivity[i]?.messages || 0,
    }))

    const dailyActivity = Array.from({ length: 14 }, (_, i) => ({
      date: new Date(now - i * 86400000).toISOString().slice(0, 10),
      conversations: 0,
    })).reverse()

    return Response.json({
      // Core counts
      totalUsers: 0,
      totalConversations: 0,
      totalMessages: 0,
      totalImages: 0,
      totalVideos: 0,
      totalVoiceMinutes: 0,

      // Active / today
      activeUsersNow: 0,
      activeUsers: 0,
      messagesToday: 0,
      conversationsToday: 0,
      monthlyMessages: 0,
      monthlyImages: 0,

      // Subscriptions
      subscriptionsByPlan: {
        free: 0,
        starter: 0,
        pro: 0,
        advanced: 0,
      },
      totalSubscribers: 0,

      // Feature usage
      featureUsage: {
        textGeneration: 0,
        imageGeneration: 0,
        videoGeneration: 0,
        deepSearch: 0,
        ideaToPrompt: 0,
        voiceCloning: 0,
      },

      // Vercel Analytics
      pageviewsToday: vercel.pageviews,
      visitorsToday: vercel.visitors,

      // Misc
      messagesPerMinute: 0,
      averageResponseTime: 0,

      // Charts
      dailyActivity,
      topQueries: [],
      hourlyActivity,

      // Sentiment / health
      responseTypes: { text: 0, search: 0, creative: 0, technical: 0 },
      userSatisfaction: { positive: 0, neutral: 0, negative: 0 },
      systemHealth: { apiResponseTime: 0, uptime: 99.9, errorRate: 0 },

      lastUpdated: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error("[analytics] error:", e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

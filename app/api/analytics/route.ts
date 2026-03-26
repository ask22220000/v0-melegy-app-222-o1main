import { getAnalytics, countUsersByPlan, todayEgypt } from "@/lib/db"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb"
import { awsCredentialsProvider } from "@vercel/functions/oidc"

export const runtime = "nodejs"

function getDocClient() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION!,
    credentials: awsCredentialsProvider({
      roleArn: process.env.AWS_ROLE_ARN!,
      clientConfig: { region: process.env.AWS_REGION },
    }),
  })
  return DynamoDBDocumentClient.from(client)
}

// Scan all daily usage rows to aggregate stats
async function aggregateDailyStats() {
  const TABLE = process.env.DYNAMODB_TABLE_NAME!
  const db = getDocClient()
  const today = todayEgypt()

  let totalImages = 0, totalVideos = 0, totalVoice = 0, messagesToday = 0
  let lastKey: Record<string, any> | undefined

  do {
    const res = await db.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":prefix": "USAGE#" },
      ExclusiveStartKey: lastKey,
    }))
    for (const item of res.Items ?? []) {
      totalImages += item.images ?? 0
      totalVideos += item.animated_videos ?? 0
      totalVoice  += item.voice_minutes ?? 0
      if (item.date === today) messagesToday += item.messages ?? 0
    }
    lastKey = res.LastEvaluatedKey
  } while (lastKey)

  return { totalImages, totalVideos, totalVoice, messagesToday }
}

// Scan recent conversations for hourly activity and top queries
async function aggregateConvStats() {
  const TABLE = process.env.DYNAMODB_TABLE_NAME!
  const db = getDocClient()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const since7d  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString()

  const hourlyActivity: { hour: number; messages: number }[] =
    Array.from({ length: 24 }, (_, i) => ({ hour: i, messages: 0 }))
  const titleFreq: Record<string, number> = {}
  let totalConversations = 0
  const uniqueUsers = new Set<string>()
  const recentUsers = new Set<string>()

  let lastKey: Record<string, any> | undefined
  do {
    const res = await db.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":prefix": "CHAT#" },
      ProjectionExpression: "userId, createdAt, title",
      ExclusiveStartKey: lastKey,
    }))
    for (const item of res.Items ?? []) {
      totalConversations++
      if (item.userId) {
        uniqueUsers.add(item.userId)
        if (item.createdAt >= since24h) recentUsers.add(item.userId)
      }
      if (item.createdAt >= since24h) {
        const h = new Date(item.createdAt).getHours()
        hourlyActivity[h].messages++
      }
      if (item.createdAt >= since7d && item.title) {
        const k = (item.title as string).trim().substring(0, 60)
        if (k.length > 2) titleFreq[k] = (titleFreq[k] ?? 0) + 1
      }
    }
    lastKey = res.LastEvaluatedKey
  } while (lastKey)

  const topQueries = Object.entries(titleFreq)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalConversations,
    uniqueUsers: uniqueUsers.size,
    recentUsers24h: recentUsers.size,
    hourlyActivity,
    topQueries,
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  const [analytics, planCounts, dailyStats, convStats] = await Promise.all([
    getAnalytics(),
    countUsersByPlan(),
    aggregateDailyStats(),
    aggregateConvStats(),
  ])

  const subscriptionsByPlan = {
    free:     planCounts.free    ?? 0,
    starter:  planCounts.startup ?? 0,
    pro:      planCounts.pro     ?? 0,
    advanced: planCounts.vip     ?? 0,
  }
  const totalSubscribers = Object.values(subscriptionsByPlan).reduce((a, b) => a + b, 0)

  const lastHour = convStats.hourlyActivity[new Date().getHours()]?.messages ?? 0
  const messagesPerMinute = Number((lastHour / 60).toFixed(2))

  return Response.json({
    totalConversations:  convStats.totalConversations,
    totalMessages:       analytics.totalMessages || convStats.totalConversations,
    totalUsers:          convStats.uniqueUsers,
    activeUsersNow:      convStats.recentUsers24h,
    activeUsers:         convStats.recentUsers24h,
    pageviewsToday:      0,
    visitorsToday:       convStats.recentUsers24h,
    messagesPerMinute,
    averageResponseTime: 0,
    subscriptionsByPlan,
    totalSubscribers,
    featureUsage: {
      textGeneration:  analytics.featureUsage?.textGeneration  ?? convStats.totalConversations,
      imageGeneration: analytics.featureUsage?.imageGeneration ?? dailyStats.totalImages,
      videoGeneration: analytics.featureUsage?.videoGeneration ?? dailyStats.totalVideos,
      deepSearch:      analytics.featureUsage?.deepSearch      ?? 0,
      ideaToPrompt:    analytics.featureUsage?.ideaToPrompt    ?? 0,
      voiceCloning:    analytics.featureUsage?.voiceCloning    ?? Math.round(dailyStats.totalVoice),
    },
    totalImages:          analytics.totalImages || dailyStats.totalImages,
    totalVideos:          analytics.totalVideos || dailyStats.totalVideos,
    totalVoiceMinutes:    Math.round(analytics.totalVoiceMinutes || dailyStats.totalVoice),
    messagesToday:        dailyStats.messagesToday,
    conversationsToday:   convStats.recentUsers24h,
    monthlyMessages:      analytics.totalMessages || 0,
    monthlyImages:        analytics.totalImages    || 0,
    dailyActivity:        [],
    responseTypes:        { text: convStats.totalConversations, search: 0, creative: 0, technical: 0 },
    userSatisfaction:     { positive: 0, neutral: 0, negative: 0 },
    systemHealth:         { apiResponseTime: 0, uptime: 99.9, errorRate: 0 },
    topQueries:           convStats.topQueries,
    hourlyActivity:       convStats.hourlyActivity,
    lastUpdated:          new Date().toISOString(),
  })
}

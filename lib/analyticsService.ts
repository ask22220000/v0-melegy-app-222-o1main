// خدمة تتبع الإحصائيات اللحظية
export interface Analytics {
  totalConversations: number
  totalMessages: number
  messagesPerMinute: number
  averageResponseTime: number
  activeUsers: number
  activeUsersNow?: number
  totalUsers?: number
  subscriptionsByPlan?: {
    free: number
    starter: number
    pro: number
    advanced: number
  }
  featureUsage: {
    textGeneration: number
    imageGeneration: number
    videoGeneration: number
    deepSearch: number
    ideaToPrompt: number
    voiceCloning: number
    documentGeneration: number
  }
  responseTypes: {
    text: number
    search: number
    creative: number
    technical: number
  }
  userSatisfaction: {
    positive: number
    neutral: number
    negative: number
  }
  systemHealth: {
    apiResponseTime: number
    uptime: number
    errorRate: number
  }
  topQueries: Array<{ query: string; count: number }>
  hourlyActivity: Array<{ hour: number; messages: number }>
  lastUpdated: Date
}

class AnalyticsService {
  private data: Analytics

  constructor() {
    // Initialize with default data
    this.data = this.loadFromStorage() || this.getDefaultData()
  }

  private getDefaultData(): Analytics {
    return {
      totalConversations: 0,
      totalMessages: 0,
      messagesPerMinute: 0,
      averageResponseTime: 0,
      activeUsers: 0,
      activeUsersNow: 0,
      totalUsers: 0,
      subscriptionsByPlan: {
        free: 0,
        starter: 0,
        pro: 0,
        advanced: 0,
      },
      featureUsage: {
        textGeneration: 0,
        imageGeneration: 0,
        videoGeneration: 0,
        deepSearch: 0,
        ideaToPrompt: 0,
        voiceCloning: 0,
        documentGeneration: 0,
      },
      responseTypes: {
        text: 0,
        search: 0,
        creative: 0,
        technical: 0,
      },
      userSatisfaction: {
        positive: 0,
        neutral: 0,
        negative: 0,
      },
      systemHealth: {
        apiResponseTime: 0,
        uptime: 100,
        errorRate: 0,
      },
      topQueries: [],
      hourlyActivity: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        messages: 0,
      })),
      lastUpdated: new Date(),
    }
  }

  private loadFromStorage(): Analytics | null {
    if (typeof window === "undefined") return null
    const stored = localStorage.getItem("melegy_analytics")
    return stored ? JSON.parse(stored) : null
  }

  private saveToStorage() {
    if (typeof window === "undefined") return
    localStorage.setItem("melegy_analytics", JSON.stringify(this.data))
  }

  // Track message
  trackMessage(type: "text" | "search" | "creative" | "technical" = "text") {
    this.data.totalMessages++
    this.data.responseTypes[type]++

    const currentHour = new Date().getHours()
    const hourData = this.data.hourlyActivity.find((h) => h.hour === currentHour)
    if (hourData) hourData.messages++

    this.data.lastUpdated = new Date()
    this.saveToStorage()
  }

  // Track conversation
  trackConversation() {
    this.data.totalConversations++
    this.saveToStorage()
  }

  // Track feature usage
  trackFeature(
    feature:
      | "textGeneration"
      | "imageGeneration"
      | "videoGeneration"
      | "deepSearch"
      | "ideaToPrompt"
      | "voiceCloning"
      | "documentGeneration",
  ) {
    this.data.featureUsage[feature]++
    this.saveToStorage()
  }

  // Track response time
  trackResponseTime(time: number) {
    const currentAvg = this.data.averageResponseTime
    const totalMessages = this.data.totalMessages
    this.data.averageResponseTime = (currentAvg * (totalMessages - 1) + time) / totalMessages
    this.data.systemHealth.apiResponseTime = time
    this.saveToStorage()
  }

  // Track user satisfaction
  trackSatisfaction(sentiment: "positive" | "neutral" | "negative") {
    this.data.userSatisfaction[sentiment]++
    this.saveToStorage()
  }

  // Track error
  trackError() {
    const totalRequests = this.data.totalMessages
    const currentErrors = this.data.systemHealth.errorRate * totalRequests
    this.data.systemHealth.errorRate = (currentErrors + 1) / (totalRequests + 1)
    this.saveToStorage()
  }

  // Update active users
  updateActiveUsers(count: number) {
    this.data.activeUsers = count
    this.saveToStorage()
  }

  // Add query to top queries
  trackQuery(query: string) {
    const existing = this.data.topQueries.find((q) => q.query === query)
    if (existing) {
      existing.count++
    } else {
      this.data.topQueries.push({ query, count: 1 })
    }

    // Keep only top 10
    this.data.topQueries.sort((a, b) => b.count - a.count)
    this.data.topQueries = this.data.topQueries.slice(0, 10)
    this.saveToStorage()
  }

  // Get all analytics
  getAnalytics(): Analytics {
    return { ...this.data }
  }

  // Reset analytics
  reset() {
    this.data = this.getDefaultData()
    this.saveToStorage()
  }

  // Update active users now
  updateActiveUsersNow(count: number) {
    this.data.activeUsersNow = count
    this.saveToStorage()
  }

  // Update total users
  updateTotalUsers(count: number) {
    this.data.totalUsers = count
    this.saveToStorage()
  }

  // Update subscriptions by plan
  updateSubscriptionsByPlan(plan: "free" | "starter" | "pro" | "advanced", count: number) {
    if (!this.data.subscriptionsByPlan) {
      this.data.subscriptionsByPlan = {
        free: 0,
        starter: 0,
        pro: 0,
        advanced: 0,
      }
    }
    this.data.subscriptionsByPlan[plan] = count
    this.saveToStorage()
  }
}

export const analyticsService = new AnalyticsService()

export async function trackAnalytics(
  action:
    | "trackMessage"
    | "trackConversation"
    | "trackFeature"
    | "trackResponseTime"
    | "trackSatisfaction"
    | "trackError"
    | "trackQuery"
    | "updateActiveUsers"
    | "updateActiveUsersNow"
    | "updateTotalUsers"
    | "updateSubscriptionsByPlan",
  data?: any,
): Promise<void> {
  try {
    switch (action) {
      case "trackMessage":
        analyticsService.trackMessage(data?.type || "text")
        break
      case "trackConversation":
        analyticsService.trackConversation()
        break
      case "trackFeature":
        analyticsService.trackFeature(data?.feature)
        break
      case "trackResponseTime":
        analyticsService.trackResponseTime(data?.time || 0)
        break
      case "trackSatisfaction":
        analyticsService.trackSatisfaction(data?.sentiment || "neutral")
        break
      case "trackError":
        analyticsService.trackError()
        break
      case "trackQuery":
        analyticsService.trackQuery(data?.query || "")
        break
      case "updateActiveUsers":
        analyticsService.updateActiveUsers(data?.count || 0)
        break
      case "updateActiveUsersNow":
        analyticsService.updateActiveUsersNow(data?.count || 0)
        break
      case "updateTotalUsers":
        analyticsService.updateTotalUsers(data?.count || 0)
        break
      case "updateSubscriptionsByPlan":
        analyticsService.updateSubscriptionsByPlan(data?.plan || "free", data?.count || 0)
        break
    }
  } catch (error) {
    console.error("[v0] Analytics tracking error:", error)
  }
}

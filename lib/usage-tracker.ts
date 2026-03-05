// Usage limits per plan - matching /pricing page exactly
export const PLAN_LIMITS = {
  free: {
    messagesPerDay: 10,
    imagesPerDay: 3,
    animatedVideosPerDay: 5,       // حرك فيديو: 5/day
    voiceMinutesPerDay: 15,        // دردشة صوتية: 15 min/day
    wordsPerMonth: -1,
    name: "مجاني"
  },
  startup: {
    messagesPerDay: 20,
    imagesPerDay: 10,
    animatedVideosPerDay: 20,      // حرك فيديو: 20/day
    voiceMinutesPerDay: 30,        // دردشة صوتية: 30 min/day
    wordsPerMonth: 30000,
    name: "Start UP"
  },
  pro: {
    messagesPerDay: -1,
    imagesPerDay: 100,
    animatedVideosPerDay: 50,      // حرك فيديو: 50/day
    voiceMinutesPerDay: 60,        // دردشة صوتية: 60 min/day
    wordsPerMonth: -1,
    name: "Pro"
  },
  vip: {
    messagesPerDay: -1,
    imagesPerDay: -1,
    animatedVideosPerDay: -1,      // يظهر لا نهائي — الحد الفعلي 150/day يُفرض في الكود
    voiceMinutesPerDay: -1,        // يظهر لا نهائي — الحد الفعلي 90 دقيقة يُفرض في الكود
    wordsPerMonth: -1,
    name: "VIP"
  }
} as const

// الحدود الفعلية المخفية للـ VIP (لا تُعرض للمستخدم)
export const VIP_ACTUAL_LIMITS = {
  animatedVideosPerDay: 150,
  voiceMinutesPerDay: 90,
} as const

export type PlanType = keyof typeof PLAN_LIMITS

// Get user's current plan from subscription
export function getUserPlan(): PlanType {
  if (typeof window === 'undefined') return 'free'
  
  // Check for active subscription in localStorage
  const subscription = localStorage.getItem('activeSubscription')
  if (subscription) {
    try {
      const subData = JSON.parse(subscription)
      const now = new Date().getTime()
      const expiresAt = new Date(subData.expiresAt).getTime()
      
      // Check if subscription is still valid
      if (expiresAt > now) {
        return subData.plan as PlanType
      }
    } catch (e) {
      // Silent fail
    }
  }
  
  return 'free'
}

// Get today's usage from localStorage
function getTodayUsage() {
  if (typeof window === 'undefined') return { messages: 0, images: 0, animatedVideos: 0, voiceMinutes: 0, date: '' }
  
  const today = new Date().toISOString().split('T')[0]
  const usage = localStorage.getItem('dailyUsage')
  
  if (usage) {
    try {
      const usageData = JSON.parse(usage)
      // Reset if it's a new day
      if (usageData.date !== today) {
        return { messages: 0, images: 0, animatedVideos: 0, voiceMinutes: 0, date: today }
      }
      // Ensure animatedVideos exists for old stored data
      if (usageData.animatedVideos === undefined) usageData.animatedVideos = 0
      return usageData
    } catch (e) {
      // Silent fail
    }
  }
  
  return { messages: 0, images: 0, animatedVideos: 0, voiceMinutes: 0, date: today }
}

// Get current month's word count
function getMonthlyWordCount() {
  if (typeof window === 'undefined') return { words: 0, month: '' }
  
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  const usage = localStorage.getItem('monthlyUsage')
  
  if (usage) {
    try {
      const usageData = JSON.parse(usage)
      // Reset if it's a new month
      if (usageData.month !== currentMonth) {
        return { words: 0, month: currentMonth }
      }
      return usageData
    } catch (e) {
      // Silent fail
    }
  }
  
  return { words: 0, month: currentMonth }
}

// Save usage to localStorage
function saveUsage(usage: { messages: number; images: number; voiceMinutes: number; date: string }) {
  if (typeof window === 'undefined') return
  localStorage.setItem('dailyUsage', JSON.stringify(usage))
}

// Save monthly usage
function saveMonthlyUsage(usage: { words: number; month: string }) {
  if (typeof window === 'undefined') return
  localStorage.setItem('monthlyUsage', JSON.stringify(usage))
}

// Check if user can send a message
export function canSendMessage(): { allowed: boolean; reason?: string; remaining?: number } {
  const plan = getUserPlan()
  const limits = PLAN_LIMITS[plan]
  const usage = getTodayUsage()
  
  // Unlimited messages
  if (limits.messagesPerDay === -1) {
    return { allowed: true }
  }
  
  // Check limit
  if (usage.messages >= limits.messagesPerDay) {
    return {
      allowed: false,
      reason: `لقد وصلت للحد الأقصى (${limits.messagesPerDay} رسالة/يوم) في خطة ${limits.name}. قم بالترقية للمزيد!`,
      remaining: 0
    }
  }
  
  return {
    allowed: true,
    remaining: limits.messagesPerDay - usage.messages
  }
}

// Check if user can generate an image
export function canGenerateImage(): { allowed: boolean; reason?: string; remaining?: number } {
  const plan = getUserPlan()
  const limits = PLAN_LIMITS[plan]
  const usage = getTodayUsage()
  
  // Unlimited images
  if (limits.imagesPerDay === -1) {
    return { allowed: true }
  }
  
  // Check limit
  if (usage.images >= limits.imagesPerDay) {
    return {
      allowed: false,
      reason: `لقد وصلت للحد الأقصى (${limits.imagesPerDay} صورة/يوم) في خطة ${limits.name}. قم بالترقية للمزيد!`,
      remaining: 0
    }
  }
  
  return {
    allowed: true,
    remaining: limits.imagesPerDay - usage.images
  }
}

// Check if user can use voice chat
export function canUseVoiceChat(): { allowed: boolean; reason?: string; remaining?: number } {
  const plan = getUserPlan()
  const limits = PLAN_LIMITS[plan]
  const usage = getTodayUsage()

  // VIP: show unlimited but enforce actual hidden cap of 90 min
  if (limits.voiceMinutesPerDay === -1) {
    if (usage.voiceMinutes >= VIP_ACTUAL_LIMITS.voiceMinutesPerDay) {
      return {
        allowed: false,
        reason: `لقد وصلت للحد الأقصى للدردشة الصوتية اليوم في خطة ${limits.name}.`,
        remaining: 0
      }
    }
    return { allowed: true }
  }

  if (usage.voiceMinutes >= limits.voiceMinutesPerDay) {
    return {
      allowed: false,
      reason: `لقد وصلت للحد الأقصى (${limits.voiceMinutesPerDay} دقيقة/يوم) في خطة ${limits.name}. قم بالترقية للمزيد!`,
      remaining: 0
    }
  }

  return {
    allowed: true,
    remaining: limits.voiceMinutesPerDay - usage.voiceMinutes
  }
}

// Check if user can animate a video
export function canAnimateVideo(): { allowed: boolean; reason?: string; remaining?: number } {
  const plan = getUserPlan()
  const limits = PLAN_LIMITS[plan]
  const usage = getTodayUsage()

  // VIP: show unlimited but enforce actual hidden cap of 150 videos
  if (limits.animatedVideosPerDay === -1) {
    if (usage.animatedVideos >= VIP_ACTUAL_LIMITS.animatedVideosPerDay) {
      return {
        allowed: false,
        reason: `لقد وصلت للحد الأقصى لتحريك الفيديو اليوم في خطة ${limits.name}.`,
        remaining: 0
      }
    }
    return { allowed: true }
  }

  if (usage.animatedVideos >= limits.animatedVideosPerDay) {
    return {
      allowed: false,
      reason: `لقد وصلت للحد الأقصى (${limits.animatedVideosPerDay} فيديو/يوم) في خطة ${limits.name}. قم بالترقية للمزيد!`,
      remaining: 0
    }
  }

  return {
    allowed: true,
    remaining: limits.animatedVideosPerDay - usage.animatedVideos
  }
}

// Check monthly word limit (for startup plan)
export function canUseWords(wordCount: number): { allowed: boolean; reason?: string; remaining?: number } {
  const plan = getUserPlan()
  const limits = PLAN_LIMITS[plan]
  
  // Unlimited or not applicable
  if (limits.wordsPerMonth === -1) {
    return { allowed: true }
  }
  
  const monthlyUsage = getMonthlyWordCount()
  
  // Check if adding these words would exceed limit
  if (monthlyUsage.words + wordCount > limits.wordsPerMonth) {
    return {
      allowed: false,
      reason: `لقد وصلت للحد الأقصى (${limits.wordsPerMonth.toLocaleString()} كلمة/شهر) في خطة ${limits.name}. قم بالترقية للمزيد!`,
      remaining: Math.max(0, limits.wordsPerMonth - monthlyUsage.words)
    }
  }
  
  return {
    allowed: true,
    remaining: limits.wordsPerMonth - monthlyUsage.words
  }
}

// Increment message usage
export async function incrementMessageUsage() {
  const usage = getTodayUsage()
  usage.messages += 1
  saveUsage(usage)
}

// Increment image usage
export async function incrementImageUsage() {
  const usage = getTodayUsage()
  usage.images += 1
  saveUsage(usage)
}

// Increment voice usage (in minutes)
export async function incrementVoiceUsage(minutes: number) {
  const usage = getTodayUsage()
  usage.voiceMinutes += minutes
  saveUsage(usage)
}

// Increment animated video usage
export async function incrementVideoUsage() {
  const usage = getTodayUsage()
  usage.animatedVideos = (usage.animatedVideos || 0) + 1
  saveUsage(usage)
}

// Increment word count
export async function incrementWordCount(words: number) {
  const monthlyUsage = getMonthlyWordCount()
  monthlyUsage.words += words
  saveMonthlyUsage(monthlyUsage)
}

// Get current usage stats
export function getUsageStats() {
  const plan = getUserPlan()
  const limits = PLAN_LIMITS[plan]
  const usage = getTodayUsage()
  const monthlyUsage = getMonthlyWordCount()

  // For VIP: show -1 (unlimited) in UI, but the actual enforcement is in canAnimate/canVoice
  const videoLimit = limits.animatedVideosPerDay
  const voiceLimit = limits.voiceMinutesPerDay

  return {
    plan,
    planName: limits.name,
    messages: {
      used: usage.messages,
      limit: limits.messagesPerDay,
      remaining: limits.messagesPerDay === -1 ? -1 : limits.messagesPerDay - usage.messages
    },
    images: {
      used: usage.images,
      limit: limits.imagesPerDay,
      remaining: limits.imagesPerDay === -1 ? -1 : limits.imagesPerDay - usage.images
    },
    video: {
      used: usage.animatedVideos || 0,
      limit: videoLimit,
      remaining: videoLimit === -1 ? -1 : videoLimit - (usage.animatedVideos || 0)
    },
    voice: {
      used: usage.voiceMinutes,
      limit: voiceLimit,
      remaining: voiceLimit === -1 ? -1 : voiceLimit - usage.voiceMinutes
    },
    words: {
      used: monthlyUsage.words,
      limit: limits.wordsPerMonth,
      remaining: limits.wordsPerMonth === -1 ? -1 : limits.wordsPerMonth - monthlyUsage.words
    }
  }
}

// Usage limits per plan - matching /pricing page exactly
export const PLAN_LIMITS = {
  free: {
    messagesPerDay: 10,
    imagesPerDay: 3,
    animatedVideosPerDay: 3,
    voiceMinutesPerDay: 15,
    wordsPerMonth: -1,
    name: "مجاني",
  },
  startup: {
    messagesPerDay: 20,
    imagesPerDay: 15,
    animatedVideosPerDay:10,
    voiceMinutesPerDay: 30,
    wordsPerMonth: 30000,
    name: "Start UP",
  },
  pro: {
    messagesPerDay: -1,
    imagesPerDay: 100,
    animatedVideosPerDay: 50,
    voiceMinutesPerDay: 60,
    wordsPerMonth: -1,
    name: "Pro",
  },
  vip: {
    messagesPerDay: -1,
    imagesPerDay: -1,
    animatedVideosPerDay: -1,
    voiceMinutesPerDay: -1,
    wordsPerMonth: -1,
    name: "VIP",
  },
} as const

// Hidden hard limits for VIP (not shown to user)
export const VIP_ACTUAL_LIMITS = {
  animatedVideosPerDay: 150,
  voiceMinutesPerDay: 90,
} as const

export type PlanType = keyof typeof PLAN_LIMITS

// ---------------------------------------------------------------------------
// In-memory cache so we don't hammer the API on every check
// ---------------------------------------------------------------------------
type UsageRow = {
  messages: number
  images: number
  animated_videos: number
  voice_minutes: number
  monthly_words: number
  monthly_images: number
  theme: string
  plan: string
}

let _cache: UsageRow | null = null
let _cacheTime = 0
const CACHE_TTL = 10_000 // 10 seconds

// Fetch today's usage from the backend (with short-lived cache)
export async function fetchUsage(): Promise<UsageRow> {
  const now = Date.now()
  if (_cache && now - _cacheTime < CACHE_TTL) return _cache

  try {
    const res = await fetch("/api/usage", { cache: "no-store" })
    if (!res.ok) throw new Error("fetch failed")
    const json = await res.json()
    _cache = json.usage as UsageRow
    _cacheTime = now
    return _cache
  } catch {
    // Return zeroed defaults on network failure
    return {
      messages: 0,
      images: 0,
      animated_videos: 0,
      voice_minutes: 0,
      monthly_words: 0,
      monthly_images: 0,
      theme: "dark",
      plan: "free",
    }
  }
}

// Persist a partial update to the backend and invalidate cache
async function saveUsage(updates: Partial<UsageRow>): Promise<void> {
  _cache = null // invalidate
  try {
    await fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
  } catch {
    // Silent fail — non-critical
  }
}

// ---------------------------------------------------------------------------
// Plan helpers
// ---------------------------------------------------------------------------

export function getUserPlan(): PlanType {
  // Plan is authoritative from the backend via fetchUsage().plan
  // For synchronous callers we fall back to localStorage for the subscription
  // token only (the token is still needed for subscription-check middleware)
  if (typeof window === "undefined") return "free"
  try {
    const sub = localStorage.getItem("activeSubscription")
    if (sub) {
      const parsed = JSON.parse(sub)
      if (new Date(parsed.expiresAt).getTime() > Date.now()) {
        return parsed.plan as PlanType
      }
    }
  } catch {
    // ignore
  }
  return "free"
}

// ---------------------------------------------------------------------------
// Check helpers — all async now
// ---------------------------------------------------------------------------

export async function canSendMessage(): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const plan = getUserPlan()
  const limits = PLAN_LIMITS[plan]
  if (limits.messagesPerDay === -1) return { allowed: true }
  const usage = await fetchUsage()
  if (usage.messages >= limits.messagesPerDay) {
    return {
      allowed: false,
      reason: `لقد وصلت للحد الأقصى (${limits.messagesPerDay} رسالة/يوم) في خطة ${limits.name}. قم بالترقية للمزيد!`,
      remaining: 0,
    }
  }
  return { allowed: true, remaining: limits.messagesPerDay - usage.messages }
}

export async function canGenerateImage(): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const plan = getUserPlan()
  const limits = PLAN_LIMITS[plan]
  if (limits.imagesPerDay === -1) return { allowed: true }
  const usage = await fetchUsage()
  if (usage.images >= limits.imagesPerDay) {
    return {
      allowed: false,
      reason: `لقد وصلت للحد الأقصى (${limits.imagesPerDay} صورة/يوم) في خطة ${limits.name}. قم بالترقية للمزيد!`,
      remaining: 0,
    }
  }
  return { allowed: true, remaining: limits.imagesPerDay - usage.images }
}

export async function canUseVoiceChat(): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const plan = getUserPlan()
  const limits = PLAN_LIMITS[plan]
  const usage = await fetchUsage()
  if (limits.voiceMinutesPerDay === -1) {
    if (usage.voice_minutes >= VIP_ACTUAL_LIMITS.voiceMinutesPerDay) {
      return { allowed: false, reason: `لقد وصلت للحد الأقصى للدردشة الصوتية اليوم في خطة ${limits.name}.`, remaining: 0 }
    }
    return { allowed: true }
  }
  if (usage.voice_minutes >= limits.voiceMinutesPerDay) {
    return {
      allowed: false,
      reason: `لقد وصلت للحد الأقصى (${limits.voiceMinutesPerDay} دقيقة/يوم) في خطة ${limits.name}. قم بالترقية للمزيد!`,
      remaining: 0,
    }
  }
  return { allowed: true, remaining: limits.voiceMinutesPerDay - usage.voice_minutes }
}

/** Sync version — uses in-memory cache (no network call). Safe to call from event handlers. */
export function canUseVoiceChatSync(): { allowed: boolean; reason?: string } {
  const plan = getUserPlan()
  const limits = PLAN_LIMITS[plan]
  const usage = _cache
  if (!usage) return { allowed: true } // no data yet — allow and recheck async
  if (limits.voiceMinutesPerDay === -1) {
    if (usage.voice_minutes >= VIP_ACTUAL_LIMITS.voiceMinutesPerDay) {
      return { allowed: false, reason: `لقد وصلت للحد الأقصى للدردشة الصوتية اليوم في خطة ${limits.name}.` }
    }
    return { allowed: true }
  }
  if (usage.voice_minutes >= limits.voiceMinutesPerDay) {
    return {
      allowed: false,
      reason: `لقد وصلت للحد الأقصى (${limits.voiceMinutesPerDay} دقيقة/يوم) في خطة ${limits.name}. قم بالترقية للمزيد!`,
    }
  }
  return { allowed: true }
}

export async function canAnimateVideo(): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const plan = getUserPlan()
  const limits = PLAN_LIMITS[plan]
  const usage = await fetchUsage()
  if (limits.animatedVideosPerDay === -1) {
    if (usage.animated_videos >= VIP_ACTUAL_LIMITS.animatedVideosPerDay) {
      return { allowed: false, reason: `لقد وصلت للحد الأقصى لتحريك الفيديو اليوم في خطة ${limits.name}.`, remaining: 0 }
    }
    return { allowed: true }
  }
  if (usage.animated_videos >= limits.animatedVideosPerDay) {
    return {
      allowed: false,
      reason: `لقد وصلت للحد الأقصى (${limits.animatedVideosPerDay} فيديو/يوم) في خطة ${limits.name}. قم بالترقية للمزيد!`,
      remaining: 0,
    }
  }
  return { allowed: true, remaining: limits.animatedVideosPerDay - usage.animated_videos }
}

/** Sync version — uses in-memory cache (no network call). Safe to call from event handlers. */
export function canAnimateVideoSync(): { allowed: boolean; reason?: string } {
  const plan = getUserPlan()
  const limits = PLAN_LIMITS[plan]
  const usage = _cache
  if (!usage) return { allowed: true } // no data yet — allow and recheck async
  if (limits.animatedVideosPerDay === -1) {
    if (usage.animated_videos >= VIP_ACTUAL_LIMITS.animatedVideosPerDay) {
      return { allowed: false, reason: `لقد وصلت للحد الأقصى لتحريك الفيديو اليوم في خطة ${limits.name}.` }
    }
    return { allowed: true }
  }
  if (usage.animated_videos >= limits.animatedVideosPerDay) {
    return {
      allowed: false,
      reason: `لقد وصلت للحد الأقصى (${limits.animatedVideosPerDay} فيديو/يوم) في خطة ${limits.name}. قم بالترقية للمزيد!`,
    }
  }
  return { allowed: true }
}

export async function canUseWords(wordCount: number): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const plan = getUserPlan()
  const limits = PLAN_LIMITS[plan]
  if (limits.wordsPerMonth === -1) return { allowed: true }
  const usage = await fetchUsage()
  if (usage.monthly_words + wordCount > limits.wordsPerMonth) {
    return {
      allowed: false,
      reason: `لقد وصلت للحد الأقصى (${limits.wordsPerMonth.toLocaleString()} كلمة/شهر) في خطة ${limits.name}. قم بالترقية للمزيد!`,
      remaining: Math.max(0, limits.wordsPerMonth - usage.monthly_words),
    }
  }
  return { allowed: true, remaining: limits.wordsPerMonth - usage.monthly_words }
}

// ---------------------------------------------------------------------------
// Increment helpers
// ---------------------------------------------------------------------------

export async function incrementMessageUsage(): Promise<void> {
  const usage = await fetchUsage()
  await saveUsage({ messages: usage.messages + 1 })
}

export async function incrementImageUsage(): Promise<void> {
  const usage = await fetchUsage()
  await saveUsage({ images: usage.images + 1 })
}

export async function incrementVoiceUsage(minutes: number): Promise<void> {
  const usage = await fetchUsage()
  await saveUsage({ voice_minutes: Number((usage.voice_minutes + minutes).toFixed(2)) })
}

export async function incrementVideoUsage(): Promise<void> {
  const usage = await fetchUsage()
  await saveUsage({ animated_videos: usage.animated_videos + 1 })
}

export async function incrementWordCount(words: number): Promise<void> {
  const usage = await fetchUsage()
  await saveUsage({ monthly_words: usage.monthly_words + words })
}

// ---------------------------------------------------------------------------
// Stats (for UsageIndicator)
// ---------------------------------------------------------------------------

export async function getUsageStats() {
  const plan = getUserPlan()
  const limits = PLAN_LIMITS[plan]
  const usage = await fetchUsage()

  return {
    plan,
    planName: limits.name,
    messages: {
      used: usage.messages,
      limit: limits.messagesPerDay,
      remaining: limits.messagesPerDay === -1 ? -1 : limits.messagesPerDay - usage.messages,
    },
    images: {
      used: usage.images,
      limit: limits.imagesPerDay,
      remaining: limits.imagesPerDay === -1 ? -1 : limits.imagesPerDay - usage.images,
    },
    video: {
      used: usage.animated_videos,
      limit: limits.animatedVideosPerDay,
      remaining: limits.animatedVideosPerDay === -1 ? -1 : limits.animatedVideosPerDay - usage.animated_videos,
    },
    voice: {
      used: usage.voice_minutes,
      limit: limits.voiceMinutesPerDay,
      remaining: limits.voiceMinutesPerDay === -1 ? -1 : limits.voiceMinutesPerDay - usage.voice_minutes,
    },
    words: {
      used: usage.monthly_words,
      limit: limits.wordsPerMonth,
      remaining: limits.wordsPerMonth === -1 ? -1 : limits.wordsPerMonth - usage.monthly_words,
    },
  }
}

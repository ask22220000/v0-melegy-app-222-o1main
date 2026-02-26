export interface SubscriptionStatus {
  isActive: boolean
  plan: string | null
  expiresAt: Date | null
  daysRemaining: number
  needsRenewal: boolean
}

// Client-side subscription check using localStorage
export async function checkSubscriptionAccess(planType: 'startup' | 'pro' | 'vip'): Promise<{
  hasAccess: boolean
  message: string
  daysRemaining?: number
}> {
  try {
    const userId = localStorage.getItem('userId')
    if (!userId) {
      return {
        hasAccess: false,
        message: 'يرجى تسجيل الدخول أولاً',
      }
    }

    // Check subscription from API
    const response = await fetch('/api/check-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, planType }),
    })

    if (!response.ok) {
      return {
        hasAccess: false,
        message: 'حدث خطأ في التحقق من الاشتراك',
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('[v0] Error checking subscription access:', error)
    return {
      hasAccess: false,
      message: 'حدث خطأ في التحقق من الاشتراك',
    }
  }
}

// Note: checkSubscription is now only available in server-side code (API routes)
// Client components should use checkSubscriptionAccess instead

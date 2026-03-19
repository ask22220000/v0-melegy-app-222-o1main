export interface SubscriptionStatus {
  isActive: boolean
  plan: string | null
  expiresAt: Date | null
  daysRemaining: number
  needsRenewal: boolean
}

// Client-side subscription check using Supabase Auth
export async function checkSubscriptionAccess(planType: 'startup' | 'pro' | 'vip'): Promise<{
  hasAccess: boolean
  message: string
  daysRemaining?: number
}> {
  try {
    const { createClient } = await import("@/lib/supabase/client")
    const { data } = await createClient().auth.getUser()

    if (!data.user) {
      return {
        hasAccess: false,
        message: 'يرجى تسجيل الدخول أولاً',
      }
    }

    const response = await fetch('/api/check-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: data.user.id, planType }),
    })

    if (!response.ok) {
      return {
        hasAccess: false,
        message: 'حدث خطأ في التحقق من الاشتراك',
      }
    }

    const result = await response.json()
    return result
  } catch (error) {
    return {
      hasAccess: false,
      message: 'حدث خطأ في التحقق من الاشتراك',
    }
  }
}

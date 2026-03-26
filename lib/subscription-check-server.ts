import { getUserMeta, getEffectivePlan } from "@/lib/db"

export interface SubscriptionStatus {
  isActive: boolean
  plan: string | null
  expiresAt: Date | null
  daysRemaining: number
  needsRenewal: boolean
}

const PLAN_HIERARCHY: Record<string, number> = { free: 0, startup: 1, pro: 2, vip: 3 }

export async function checkSubscription(requiredPlan: string, userId?: string): Promise<SubscriptionStatus> {
  try {
    if (!userId) {
      return { isActive: false, plan: null, expiresAt: null, daysRemaining: 0, needsRenewal: true }
    }

    const effectivePlan = await getEffectivePlan(userId)
    const meta = await getUserMeta(userId)

    const userLevel     = PLAN_HIERARCHY[effectivePlan] ?? 0
    const requiredLevel = PLAN_HIERARCHY[requiredPlan]  ?? 0

    if (userLevel < requiredLevel) {
      return { isActive: false, plan: effectivePlan, expiresAt: null, daysRemaining: 0, needsRenewal: true }
    }

    let daysRemaining = 999
    let expiresAt: Date | null = null

    if (meta?.planExpiresAt) {
      expiresAt = new Date(meta.planExpiresAt)
      daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    }

    return {
      isActive: true,
      plan: effectivePlan,
      expiresAt,
      daysRemaining,
      needsRenewal: daysRemaining <= 3,
    }
  } catch (err: unknown) {
    console.error("[subscription-check-server] error:", err instanceof Error ? err.message : err)
    return { isActive: false, plan: null, expiresAt: null, daysRemaining: 0, needsRenewal: true }
  }
}

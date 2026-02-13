import { createClient } from "@/lib/supabase/server"

export interface SubscriptionStatus {
  isActive: boolean
  plan: string | null
  expiresAt: Date | null
  daysRemaining: number
  needsRenewal: boolean
}

export async function checkSubscription(requiredPlan: string, userIp?: string): Promise<SubscriptionStatus> {
  try {
    const supabase = await createClient()

    // Get active subscription for this IP
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_ip", userIp || "unknown")
      .eq("status", "active")
      .eq("plan_name", requiredPlan)
      .order("expires_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !subscription) {
      console.log("[v0] No active subscription found for:", { requiredPlan, userIp })
      return {
        isActive: false,
        plan: null,
        expiresAt: null,
        daysRemaining: 0,
        needsRenewal: true,
      }
    }

    const now = new Date()
    const expiresAt = new Date(subscription.expires_at)
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Check if expired
    if (expiresAt < now) {
      console.log("[v0] Subscription expired:", subscription.id)
      
      // Update subscription status to expired
      await supabase
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("id", subscription.id)

      return {
        isActive: false,
        plan: subscription.plan_name,
        expiresAt,
        daysRemaining: 0,
        needsRenewal: true,
      }
    }

    console.log("[v0] Active subscription found:", {
      plan: subscription.plan_name,
      expiresAt,
      daysRemaining,
    })

    return {
      isActive: true,
      plan: subscription.plan_name,
      expiresAt,
      daysRemaining,
      needsRenewal: daysRemaining <= 3, // Show renewal warning 3 days before expiry
    }
  } catch (error) {
    console.error("[v0] Error checking subscription:", error)
    return {
      isActive: false,
      plan: null,
      expiresAt: null,
      daysRemaining: 0,
      needsRenewal: true,
    }
  }
}

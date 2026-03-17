import { type NextRequest, NextResponse } from "next/server"
import { getServiceRoleClient } from "@/lib/supabase/server"

// Plan limits
const PLAN_LIMITS = {
  free: 3, // 3 times total (trial)
  starter: 5, // 5 times per month
  pro: 20, // 20 times per month
  advanced: 50, // 50 times per month
}

// Tokens per purchase: 20 tokens = 25 image edits
const TOKENS_PER_PURCHASE = 20
const EDITS_PER_TOKEN_PURCHASE = 25

function getCurrentMonthYear(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function getMonthStartDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const visitorId = searchParams.get("visitorId")
    const planType = searchParams.get("planType") || "free"

    if (!visitorId) {
      return NextResponse.json({ error: "visitorId required" }, { status: 400 })
    }

    const limit = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS] || 3

    let query = supabase
      .from("feature_usage")
      .select("id", { count: "exact" })
      .eq("user_id", visitorId)
      .like("feature_name", `image_edit_${planType}%`)

    // For paid plans, only count this month's usage
    if (planType !== "free") {
      const monthStart = getMonthStartDate()
      query = query.gte("used_at", monthStart)
    }

    const { count: usageCount, error: usageError } = await query

    if (usageError) {
      console.error("[v0] Error fetching usage:", usageError)
    }

    const currentUsage = usageCount || 0
    const remaining = Math.max(0, limit - currentUsage)

    const { count: purchasedCount } = await supabase
      .from("feature_usage")
      .select("id", { count: "exact" })
      .eq("user_id", visitorId)
      .eq("feature_name", "token_purchase")

    const { count: usedTokenCount } = await supabase
      .from("feature_usage")
      .select("id", { count: "exact" })
      .eq("user_id", visitorId)
      .eq("feature_name", "token_used")

    const totalPurchased = (purchasedCount || 0) * TOKENS_PER_PURCHASE
    const totalUsed = usedTokenCount || 0
    const availableTokens = Math.max(0, totalPurchased - totalUsed)
    // 20 tokens = 25 edits
    const tokenEditsRemaining = Math.floor(availableTokens * (EDITS_PER_TOKEN_PURCHASE / TOKENS_PER_PURCHASE))

    return NextResponse.json({
      usageCount: currentUsage,
      limit,
      remaining,
      canUse: remaining > 0 || tokenEditsRemaining > 0,
      planType,
      availableTokens,
      tokenEditsRemaining,
      isUsingTokens: remaining <= 0 && tokenEditsRemaining > 0,
    })
  } catch (error) {
    console.error("[v0] Error checking usage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient()
    const body = await request.json()
    const { visitorId, planType = "free", action } = body

    if (!visitorId) {
      return NextResponse.json({ error: "visitorId required" }, { status: 400 })
    }

    const limit = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS] || 3

    if (action === "increment") {
      let query = supabase
        .from("feature_usage")
        .select("id", { count: "exact" })
        .eq("user_id", visitorId)
        .like("feature_name", `image_edit_${planType}%`)

      if (planType !== "free") {
        const monthStart = getMonthStartDate()
        query = query.gte("used_at", monthStart)
      }

      const { count: usageCount } = await query
      const currentCount = usageCount || 0

      // Check if within limit
      if (currentCount >= limit) {
        // Check tokens
        const { count: purchasedCount } = await supabase
          .from("feature_usage")
          .select("id", { count: "exact" })
          .eq("user_id", visitorId)
          .eq("feature_name", "token_purchase")

        const { count: usedTokenCount } = await supabase
          .from("feature_usage")
          .select("id", { count: "exact" })
          .eq("user_id", visitorId)
          .eq("feature_name", "token_used")

        const totalPurchased = (purchasedCount || 0) * TOKENS_PER_PURCHASE
        const totalUsed = usedTokenCount || 0
        const availableTokens = totalPurchased - totalUsed

        if (availableTokens > 0) {
          await supabase.from("feature_usage").insert({
            user_id: visitorId,
            feature_name: "token_used",
            used_at: new Date().toISOString(),
          })

          return NextResponse.json({
            success: true,
            usedTokens: true,
            newUsageCount: currentCount,
          })
        }

        return NextResponse.json({
          success: false,
          limitReached: true,
          usageCount: currentCount,
          limit,
        })
      }

      const currentMonth = getCurrentMonthYear()
      await supabase.from("feature_usage").insert({
        user_id: visitorId,
        feature_name: `image_edit_${planType}_${currentMonth}`,
        used_at: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        newUsageCount: currentCount + 1,
        remaining: limit - (currentCount + 1),
      })
    }

    if (action === "addTokens") {
      await supabase.from("feature_usage").insert({
        user_id: visitorId,
        feature_name: "token_purchase",
        used_at: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        tokensAdded: TOKENS_PER_PURCHASE,
        editsAdded: EDITS_PER_TOKEN_PURCHASE,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error updating usage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

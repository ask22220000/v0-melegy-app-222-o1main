import { NextRequest } from "next/server"
import { setUserSubscription, ensureUserMeta, incrementPlanCount, incrementAnalytics } from "@/lib/db"

export const runtime = "nodejs"

const PLAN_MAP: Record<string, "free" | "startup" | "pro" | "vip"> = {
  startup: "startup",
  starter: "startup",
  pro: "pro",
  vip: "vip",
  advanced: "vip",
}

// The merchant_order_id format from Kashier is: "plan_{plan}_{userId}"
// e.g. "plan_pro_mlg_abc123"
function extractPlanAndUser(merchantOrderId?: string): { plan: "free" | "startup" | "pro" | "vip"; userId: string | null } {
  if (!merchantOrderId) return { plan: "free", userId: null }
  const match = merchantOrderId.match(/^plan_(\w+)_(.+)$/)
  if (!match) return { plan: "free", userId: null }
  const plan = PLAN_MAP[match[1].toLowerCase()] ?? "free"
  const userId = match[2] || null
  return { plan, userId }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { status, merchant_order_id } = body

    const isSuccess = ["SUCCESS", "success", "CAPTURED", "PAID"].includes(status)
    if (!isSuccess) {
      return Response.json({ success: true, message: "Webhook received but not processed" })
    }

    const { plan, userId } = extractPlanAndUser(merchant_order_id)

    if (!userId) {
      console.error("[kashier-webhook] Could not extract userId from merchant_order_id:", merchant_order_id)
      return Response.json({ success: false, error: "Missing userId in order ID" }, { status: 400 })
    }

    // Ensure user exists then set subscription for 30 days
    await ensureUserMeta(userId)
    await setUserSubscription(userId, plan, 30)

    // Update analytics counters (fire-and-forget)
    incrementPlanCount(plan, 1).catch(() => {})
    incrementAnalytics("totalUsers", 0).catch(() => {}) // touch the record

    console.log(`[kashier-webhook] Subscription set: userId=${userId} plan=${plan}`)
    return Response.json({ success: true, message: "Webhook processed", userId, plan })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook processing failed"
    console.error("[kashier-webhook] error:", msg)
    return Response.json({ success: false, error: msg }, { status: 500 })
  }
}

// GET — webhook verification ping
export async function GET() {
  return Response.json({ status: "Kashier webhook endpoint active" })
}

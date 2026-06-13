import { NextRequest } from "next/server"
import { ensureUserMeta, setUserSubscription, incrementPlanCount } from "@/lib/db"

export const runtime = "nodejs"

const planMap: Record<string, "free" | "startup" | "pro" | "vip"> = {
  startup: "startup",
  starter: "startup",
  pro: "pro",
  vip: "vip",
  advanced: "vip",
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      status,
      merchant_order_id,
      customer_email,
    } = body

    if (status === "SUCCESS" || status === "success" || status === "CAPTURED") {
      // Extract userId and plan from merchant_order_id format: plan_PLANNAME_USERID
      const parts = (merchant_order_id ?? "").split("_")
      const planRaw = parts[1] ?? ""
      const userId = parts.slice(2).join("_") || customer_email || "unknown"

      const plan = planMap[planRaw.toLowerCase()] ?? "startup"

      await ensureUserMeta(userId)
      await setUserSubscription(userId, plan, 30)
      await incrementPlanCount(plan, 1)
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error("[kashier-webhook] error:", error.message)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({ status: "Kashier webhook endpoint active" })
}

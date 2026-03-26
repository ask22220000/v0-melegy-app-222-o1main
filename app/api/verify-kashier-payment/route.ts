import { NextRequest, NextResponse } from "next/server"
import { setUserSubscription, ensureUserMeta, getEffectivePlan, incrementPlanCount } from "@/lib/db"

export const runtime = "nodejs"

type ValidPlan = "startup" | "pro" | "vip"
const VALID_PLANS: ValidPlan[] = ["startup", "pro", "vip"]

export async function POST(request: NextRequest) {
  try {
    const { paymentId, plan, userId } = await request.json()

    if (!paymentId || !plan || !userId) {
      return NextResponse.json({ success: false, error: "Missing paymentId, plan, or userId" }, { status: 400 })
    }

    if (!VALID_PLANS.includes(plan as ValidPlan)) {
      return NextResponse.json({ success: false, error: "Invalid plan" }, { status: 400 })
    }

    const kashierApiKey = process.env.KASHER_API_KEY
    const kashierMerchantId = process.env.NEXT_PUBLIC_KASHER_MID
    let paymentStatus: "pending" | "completed" | "failed" = "pending"

    if (kashierApiKey && kashierMerchantId) {
      try {
        const resp = await fetch(`https://api.kashier.io/transactions/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${kashierApiKey}`,
            "X-Merchant-ID": kashierMerchantId,
          },
        })
        if (resp.ok) {
          const data = await resp.json()
          if (["SUCCESS", "PAID", "CAPTURED"].includes(data.status)) paymentStatus = "completed"
          else if (["FAILED", "CANCELLED"].includes(data.status)) paymentStatus = "failed"
        }
      } catch {
        // Kashier API unavailable — keep pending
      }
    } else {
      // No API credentials — auto-approve for testing
      paymentStatus = "completed"
    }

    if (paymentStatus === "completed") {
      await ensureUserMeta(userId)
      const prevPlan = await getEffectivePlan(userId)
      await setUserSubscription(userId, plan as ValidPlan, 30)
      // Update analytics plan counts
      if (prevPlan !== plan) {
        if (prevPlan !== "free") incrementPlanCount(prevPlan as ValidPlan, -1).catch(() => {})
        incrementPlanCount(plan as ValidPlan, 1).catch(() => {})
      }

      return NextResponse.json({ success: true, status: "completed", plan })
    }

    return NextResponse.json({
      success: false,
      status: paymentStatus,
      message: paymentStatus === "failed" ? "فشلت عملية الدفع" : "جاري معالجة الدفع",
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to verify payment"
    console.error("[verify-kashier-payment] error:", msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

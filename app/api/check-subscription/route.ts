import { NextRequest, NextResponse } from "next/server"
import { getEffectivePlan, getUserMeta, ensureUserMeta } from "@/lib/db"

export const runtime = "nodejs"

const PLAN_HIERARCHY: Record<string, number> = { free: 0, startup: 1, pro: 2, vip: 3 }

export async function POST(request: NextRequest) {
  try {
    const { userId, planType } = await request.json()

    if (!userId || !planType) {
      return NextResponse.json({ hasAccess: false, message: "بيانات غير مكتملة" }, { status: 400 })
    }

    await ensureUserMeta(userId)
    const effectivePlan = await getEffectivePlan(userId)
    const meta = await getUserMeta(userId)

    const userLevel = PLAN_HIERARCHY[effectivePlan] ?? 0
    const requiredLevel = PLAN_HIERARCHY[planType] ?? 0

    if (userLevel < requiredLevel) {
      return NextResponse.json({
        hasAccess: false,
        message: "لا يوجد اشتراك نشط. يرجى الاشتراك للوصول لهذه الخطة.",
      })
    }

    // Calculate days remaining
    let daysRemaining = 999
    if (meta?.planExpiresAt) {
      const diff = new Date(meta.planExpiresAt).getTime() - Date.now()
      daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24))
    }

    return NextResponse.json({
      hasAccess: true,
      plan: effectivePlan,
      message:
        daysRemaining <= 3
          ? `اشتراكك سينتهي خلال ${daysRemaining} أيام. يرجى التجديد قريباً.`
          : "اشتراكك نشط",
      daysRemaining,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف"
    console.error("[check-subscription] error:", msg)
    return NextResponse.json({ hasAccess: false, message: "حدث خطأ في التحقق من الاشتراك" }, { status: 500 })
  }
}

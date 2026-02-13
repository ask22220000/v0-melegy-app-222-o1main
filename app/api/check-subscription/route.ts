import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { userId, planType } = await request.json()

    if (!userId || !planType) {
      return NextResponse.json(
        { hasAccess: false, message: "بيانات غير مكتملة" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check for active subscription
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("plan_type", planType)
      .eq("status", "active")
      .order("end_date", { ascending: false })
      .limit(1)
      .single()

    if (error || !subscription) {
      console.log("[v0] No active subscription found:", { userId, planType })
      return NextResponse.json({
        hasAccess: false,
        message: "لا يوجد اشتراك نشط. يرجى الاشتراك للوصول لهذه الخطة.",
      })
    }

    const now = new Date()
    const endDate = new Date(subscription.end_date)
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Check if expired
    if (endDate < now) {
      console.log("[v0] Subscription expired:", subscription.id)
      
      // Update status to expired
      await supabase
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("id", subscription.id)

      return NextResponse.json({
        hasAccess: false,
        message: "انتهت صلاحية اشتراكك. يرجى تجديد الاشتراك للمتابعة.",
      })
    }

    console.log("[v0] Active subscription found:", {
      userId,
      planType,
      daysRemaining,
    })

    return NextResponse.json({
      hasAccess: true,
      message: daysRemaining <= 3 
        ? `اشتراكك سينتهي خلال ${daysRemaining} أيام. يرجى التجديد قريباً.`
        : "اشتراكك نشط",
      daysRemaining,
    })

  } catch (error) {
    console.error("[v0] Error checking subscription:", error)
    return NextResponse.json(
      { 
        hasAccess: false, 
        message: "حدث خطأ في التحقق من الاشتراك" 
      },
      { status: 500 }
    )
  }
}

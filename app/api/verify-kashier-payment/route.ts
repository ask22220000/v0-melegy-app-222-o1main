import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { paymentId, plan } = await request.json()

    console.log("[v0] Verifying Kashier payment:", { paymentId, plan })

    if (!paymentId || !plan) {
      return NextResponse.json(
        { success: false, error: "Missing payment ID or plan" },
        { status: 400 }
      )
    }

    // Get user IP
    const userIp = request.headers.get("x-forwarded-for") || 
                   request.headers.get("x-real-ip") || 
                   "unknown"

    const supabase = await createClient()

    // Check if payment already processed
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("kashier_payment_id", paymentId)
      .single()

    if (existingSubscription && existingSubscription.payment_status === "completed") {
      console.log("[v0] Payment already processed:", paymentId)
      return NextResponse.json({
        success: true,
        status: "completed",
        subscription: existingSubscription,
      })
    }

    // In production, verify with Kashier API
    // For now, we'll check if payment exists and mark as completed
    // TODO: Add actual Kashier API verification when API key is provided
    
    const kashierApiKey = process.env.KASHER_API_KEY
    const kashierMerchantId = process.env.NEXT_PUBLIC_KASHER_MID
    
    let paymentStatus = "pending"
    
    if (kashierApiKey && kashierMerchantId) {
      try {
        // Call Kashier API to verify payment
        const kashierResponse = await fetch(
          `https://api.kashier.io/transactions/${paymentId}`,
          {
            headers: {
              Authorization: `Bearer ${kashierApiKey}`,
              "X-Merchant-ID": kashierMerchantId,
            },
          }
        )

        if (kashierResponse.ok) {
          const kashierData = await kashierResponse.json()
          console.log("[v0] Kashier API response:", kashierData)
          
          // Check if payment is successful based on Kashier's response
          if (kashierData.status === "SUCCESS" || kashierData.status === "PAID") {
            paymentStatus = "completed"
          } else if (kashierData.status === "FAILED" || kashierData.status === "CANCELLED") {
            paymentStatus = "failed"
          }
        }
      } catch (error) {
        console.error("[v0] Error calling Kashier API:", error)
      }
    } else {
      // Fallback: Auto-approve after first check (for testing without API key)
      // In production, this should NOT happen - always verify with Kashier
      console.warn("[v0] No Kashier API credentials found - using fallback verification")
      
      if (!existingSubscription) {
        // First time seeing this payment - mark as pending
        paymentStatus = "pending"
      } else {
        // Second check onwards - assume completed for testing
        paymentStatus = "completed"
      }
    }

    // Map plan to database values
    const planMap: Record<string, string> = {
      startup: "Start UP",
      pro: "Pro",
      vip: "VIP",
    }

    const paymentLinks: Record<string, string> = {
      startup: "https://checkouts.kashier.io/ar/paymentpage?ppLink=PP-1817925701,live",
      pro: "https://checkouts.kashier.io/ar/paymentpage?ppLink=PP-1817925702,live",
      vip: "https://checkouts.kashier.io/ar/paymentpage?ppLink=PP-1817925703,live",
    }

    if (paymentStatus === "completed") {
      // Create or update subscription
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30) // 30 days from now

      const subscriptionData = {
        user_ip: userIp,
        plan_name: planMap[plan] || plan,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        kashier_payment_id: paymentId,
        payment_status: "completed",
        payment_link: paymentLinks[plan],
        created_at: new Date().toISOString(),
      }

      if (existingSubscription) {
        // Update existing
        const { data, error } = await supabase
          .from("subscriptions")
          .update(subscriptionData)
          .eq("id", existingSubscription.id)
          .select()
          .single()

        if (error) {
          console.error("[v0] Error updating subscription:", error)
          throw error
        }

        console.log("[v0] Subscription updated:", data)

        return NextResponse.json({
          success: true,
          status: "completed",
          subscription: data,
        })
      } else {
        // Create new
        const { data, error } = await supabase
          .from("subscriptions")
          .insert([subscriptionData])
          .select()
          .single()

        if (error) {
          console.error("[v0] Error creating subscription:", error)
          throw error
        }

        console.log("[v0] Subscription created:", data)

        return NextResponse.json({
          success: true,
          status: "completed",
          subscription: data,
        })
      }
    }

    // Payment still pending or failed
    return NextResponse.json({
      success: false,
      status: paymentStatus,
      message: paymentStatus === "failed" ? "فشلت عملية الدفع" : "جاري معالجة الدفع",
    })
  } catch (error) {
    console.error("[v0] Error in verify-kashier-payment:", error)
    return NextResponse.json(
      { success: false, error: "Failed to verify payment" },
      { status: 500 }
    )
  }
}

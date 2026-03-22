import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Kasher callback endpoint for receiving payment notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log("[v0] Kasher callback received:", body)

    // Extract payment details from Kasher callback
    const {
      transactionId,
      merchantOrderId,
      status,
      amount,
      currency,
      response,
    } = body

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: "Missing transaction ID" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 503 })
    }

    // Map status from Kasher
    let paymentStatus = "pending"
    if (status === "SUCCESS" || status === "PAID" || response?.status === "SUCCESS") {
      paymentStatus = "completed"
    } else if (status === "FAILED" || status === "CANCELLED") {
      paymentStatus = "failed"
    }

    // Try to find existing subscription by transaction ID
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("kashier_payment_id", transactionId)
      .single()

    if (existingSubscription) {
      // Update existing subscription
      const { error } = await supabase
        .from("subscriptions")
        .update({
          payment_status: paymentStatus,
          status: paymentStatus === "completed" ? "active" : "failed",
        })
        .eq("id", existingSubscription.id)

      if (error) {
        console.error("[v0] Error updating subscription:", error)
        return NextResponse.json(
          { success: false, error: "Database error" },
          { status: 500 }
        )
      }

      console.log("[v0] Subscription updated via callback:", transactionId)
    }

    return NextResponse.json({ success: true, received: true })
  } catch (error) {
    console.error("[v0] Error in Kasher callback:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Handle GET requests (some payment gateways use GET for callbacks)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const body = {
    transactionId: searchParams.get('transactionId') || searchParams.get('transaction_id'),
    merchantOrderId: searchParams.get('merchantOrderId') || searchParams.get('orderId'),
    status: searchParams.get('status'),
    amount: searchParams.get('amount'),
    currency: searchParams.get('currency'),
  }

  console.log("[v0] Kasher GET callback received:", body)

  // Process same as POST
  return POST(request)
}

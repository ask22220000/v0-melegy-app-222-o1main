import { createClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"

// Use server-side env vars (with fallback for backwards compatibility)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('[v0] Kashier webhook received:', body)
    
    // Kashier webhook payload structure
    const {
      order_id,
      status,
      amount,
      currency,
      customer_email,
      customer_phone,
      merchant_order_id,
      payment_method,
      card_last_four,
      transaction_id,
    } = body
    
    // Only process successful payments
    if (status === 'SUCCESS' || status === 'success' || status === 'CAPTURED') {
      // Extract plan from merchant_order_id (format: "plan_startup_userid")
      const planMatch = merchant_order_id?.match(/plan_(\w+)_/)
      const planName = planMatch ? planMatch[1] : null
      
      // Map plan names
      const planMap: Record<string, string> = {
        startup: 'startup',
        starter: 'startup',
        pro: 'pro',
        vip: 'vip',
        advanced: 'vip'
      }
      
      const normalizedPlan = planName ? planMap[planName.toLowerCase()] || planName : 'free'
      
      // Get or create user
      let userId = null
      if (customer_email) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', customer_email)
          .single()
        
        if (existingUser) {
          userId = existingUser.id
        } else {
          // Create new user
          const { data: newUser } = await supabase
            .from('users')
            .insert({
              email: customer_email,
              phone: customer_phone,
              created_at: new Date().toISOString(),
            })
            .select('id')
            .single()
          
          userId = newUser?.id
        }
      }
      
      // Create or update subscription
      if (userId) {
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + 1) // 1 month subscription
        
        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan_name: normalizedPlan,
            status: 'active',
            payment_method: payment_method || 'kashier',
            amount: amount,
            currency: currency || 'EGP',
            kashier_transaction_id: transaction_id,
            kashier_order_id: order_id,
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          })
        
        if (subError) {
          console.error('[v0] Error upserting subscription:', subError)
        } else {
          console.log('[v0] Subscription created/updated for user:', userId, 'plan:', normalizedPlan)
        }
      }
      
      // Log payment
      await supabase.from('payments').insert({
        user_id: userId,
        amount: amount,
        currency: currency || 'EGP',
        status: 'completed',
        payment_method: 'kashier',
        kashier_transaction_id: transaction_id,
        kashier_order_id: order_id,
        metadata: body,
        created_at: new Date().toISOString(),
      })
      
      return Response.json({ success: true, message: 'Webhook processed' })
    }
    
    return Response.json({ success: true, message: 'Webhook received but not processed' })
  } catch (error) {
    console.error('[v0] Kashier webhook error:', error)
    return Response.json({ success: false, error: 'Webhook processing failed' }, { status: 500 })
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return Response.json({ status: 'Kashier webhook endpoint active' })
}

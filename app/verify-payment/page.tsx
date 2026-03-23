"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

function VerifyPaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying")
  const [message, setMessage] = useState("جاري التحقق من عملية الدفع...")
  
  // Get plan from URL or localStorage
  const planFromUrl = searchParams.get("plan") // startup, pro, vip
  const planFromStorage = typeof window !== 'undefined' ? 
    JSON.parse(localStorage.getItem('pendingPlan') || '{}').planId : null
  const plan = planFromUrl || planFromStorage
  
  // Kasher returns these parameters after payment
  const transactionId = searchParams.get("transactionId") || 
                        searchParams.get("transaction_id") ||
                        searchParams.get("merchantOrderId") ||
                        searchParams.get("orderId")
  const paymentStatus = searchParams.get("status")
  
  // Use transaction ID as payment ID
  const paymentId = transactionId || `kasher_${Date.now()}_${plan}`
  
  console.log('[v0] Verify page loaded:', { plan, paymentId, transactionId, paymentStatus, allParams: Object.fromEntries(searchParams.entries()) })

  useEffect(() => {
    if (!plan || !paymentId) {
      setStatus("failed")
      setMessage("معلومات الدفع غير مكتملة")
      return
    }

    let attempts = 0
    const maxAttempts = 40 // 40 attempts x 3 seconds = 2 minutes max

    const checkPayment = async () => {
      attempts++
      
      try {
        console.log("[v0] Verifying payment attempt:", attempts)
        
        const response = await fetch("/api/verify-kashier-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            paymentId, 
            plan 
          }),
        })

        const data = await response.json()
        
        console.log("[v0] Payment verification response:", data)

        if (data.success && data.status === "completed") {
          setStatus("success")
          setMessage("تم تأكيد الدفع بنجاح! جاري تحويلك...")
          
          // Get redirect URL from localStorage or use default
          const pendingPlan = localStorage.getItem('pendingPlan')
          let redirectUrl = "/chat"
          
          if (pendingPlan) {
            const planData = JSON.parse(pendingPlan)
            redirectUrl = planData.redirectUrl || "/chat"
          } else {
            // Fallback redirect map based on plan
            const redirectMap: Record<string, string> = {
              startup: "/chat-starter",
              pro: "/chat-pro",
              vip: "/chat-advanced",
            }
            redirectUrl = redirectMap[plan] || "/chat"
          }
          
          console.log('[v0] Redirecting to:', redirectUrl)
          
          // Redirect after 2 seconds
          setTimeout(() => {
            window.location.href = redirectUrl
          }, 2000)
        } else if (data.status === "failed") {
          setStatus("failed")
          setMessage("فشلت عملية الدفع. يرجى المحاولة مرة أخرى.")
        } else if (attempts >= maxAttempts) {
          setStatus("failed")
          setMessage("انتهت مهلة التحقق. يرجى التواصل مع الدعم.")
        } else {
          // Continue polling
          setTimeout(checkPayment, 3000)
        }
      } catch (error) {
        console.error("[v0] Payment verification error:", error)
        if (attempts >= maxAttempts) {
          setStatus("failed")
          setMessage("حدث خطأ أثناء التحقق. يرجى التواصل مع الدعم.")
        } else {
          setTimeout(checkPayment, 3000)
        }
      }
    }

    // Start polling after 3 seconds
    const timer = setTimeout(checkPayment, 3000)

    return () => clearTimeout(timer)
  }, [plan, paymentId, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-6">
        {status === "verifying" && (
          <>
            <Loader2 className="h-16 w-16 mx-auto animate-spin text-cyan-500" />
            <h1 className="text-2xl font-bold text-foreground">جاري التحقق من الدفع</h1>
            <p className="text-muted-foreground">{message}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
              <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse delay-150" />
              <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse delay-300" />
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <h1 className="text-2xl font-bold text-foreground">تم تأكيد الدفع بنجاح!</h1>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === "failed" && (
          <>
            <XCircle className="h-16 w-16 mx-auto text-red-500" />
            <h1 className="text-2xl font-bold text-foreground">فشل التحقق من الدفع</h1>
            <p className="text-muted-foreground">{message}</p>
            <button
              onClick={() => router.push("/pricing")}
              className="mt-4 px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
            >
              العودة للخطط
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyPaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-6">
          <Loader2 className="h-16 w-16 mx-auto animate-spin text-cyan-500" />
          <h1 className="text-2xl font-bold text-foreground">جاري التحميل...</h1>
        </div>
      </div>
    }>
      <VerifyPaymentContent />
    </Suspense>
  )
}

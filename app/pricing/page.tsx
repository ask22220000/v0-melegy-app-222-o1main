"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Crown, Sparkles, Zap, Star, ArrowRight, Home } from "lucide-react"
import Link from "next/link"
import Script from "next/script"

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [paypalLoaded, setPaypalLoaded] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const plans = [
    {
      id: "free",
      name: "الخطة المجانية",
      nameEn: "Free",
      description: "ابدأ مجاناً بدون حدود زمنية",
      price: "0",
      period: "مجاناً",
      features: [
        "10 رسائل يومياً",
        "3 صور يومياً",
        "3 فيديوهات يومياً",
        "كتابة نصوص قصيرة",
        "تحليل بيانات بسيط",
        "مساعدة في محتوى أساسي",
        "دعم المحادثة الصوتية",
      ],
      buttonText: "ابدأ الآن مجاناً",
      buttonDisabled: false,
      icon: Star,
      color: "from-gray-600 to-gray-700",
      popular: false,
      paypalId: null,
      link: "/chat",
    },
    {
      id: "startup",
      name: "خطة Start UP",
      nameEn: "Start UP",
      description: "للمبتدئين والطلاب",
      price: "49",
      period: "شهرياً",
      features: [
        "توليد 10 صور يومياً",
        "كتابة نصوص قصيرة (حتى 500 كلمة)",
        "شيتات بسيطة (حتى 50 صفوف)",
        "5 اقتراحات أفكار يومياً",
        "مساعدة في محتوى أساسي",
        "دردشة ودية محدودة (20 رسالة/يوم)",
      ],
      buttonText: "اشترك الآن",
      buttonDisabled: false,
      icon: Zap,
      color: "from-blue-600 to-cyan-600",
      popular: false,
      paypalId: null,
      kasherLink: "https://checkouts.kashier.io/ar/paymentpage?ppLink=PP-1817925701,live",
      link: "/chat-starter",
    },
    {
      id: "pro",
      name: "الخطة الاحترافية",
      nameEn: "Pro",
      description: "للمحترفين وأصحاب المشاريع",
      price: "129",
      period: "شهرياً",
      features: [
        "توليد 100 صورة يومياً",
        "كتابة نصوص كاملة (غير محدودة)",
        "شيتات متقدمة (حتى 1000 صف)",
        "اقتراحات أفكار غير محدودة",
        "كتابة بحث أو محتوى كامل",
        "دردشة متخصصة غير محدودة",
      ],
      buttonText: "اشترك الآن",
      buttonDisabled: false,
      icon: Sparkles,
      color: "from-purple-600 to-pink-600",
      popular: true,
      paypalId: null,
      kasherLink: "https://checkouts.kashier.io/ar/paymentpage?ppLink=PP-1817925702,live",
      link: "/chat-pro",
    },
    {
      id: "vip",
      name: "الخطة VIP",
      nameEn: "VIP",
      description: "كل شيء بلا حدود مع دعم فوري",
      price: "299",
      period: "شهرياً",
      features: [
        "توليد صور غير محدود",
        "كل الميزات السابقة بدون حدود",
        "شيتات مع تحليل بيانات",
        "أفكار مخصصة متقدمة",
        "دعم أولوية فوري",
        "دردشة مخصصة حسب الطلب مع ذاكرة",
      ],
      buttonText: "احصل على VIP",
      buttonDisabled: false,
      icon: Crown,
      color: "from-yellow-500 to-orange-600",
      popular: false,
      paypalId: null,
      kasherLink: "https://checkouts.kashier.io/ar/paymentpage?ppLink=PP-1817925703,live",
      link: "/chat-advanced",
    },
  ]

  // Initialize PayPal button for legend plan when selected
  useEffect(() => {
    if (selectedPlan === "legend" && paypalLoaded) {
      const container = document.getElementById("paypal-button-container-P-7Y891040P38339115NFHYM4Q")
      if (container && (window as any).paypal) {
        container.innerHTML = ""
        ;(window as any).paypal
          .Buttons({
            style: {
              shape: "pill",
              color: "blue",
              layout: "vertical",
              label: "subscribe",
            },
            createSubscription: (data: any, actions: any) =>
              actions.subscription.create({
                plan_id: "P-7Y891040P38339115NFHYM4Q",
              }),
            onApprove: (data: any) => {
              alert("تم الاشتراك بنجاح! رقم الاشتراك: " + data.subscriptionID)
              window.location.href = "/chat-advanced"
            },
          })
          .render("#paypal-button-container-P-7Y891040P38339115NFHYM4Q")
      }
    }
  }, [selectedPlan, paypalLoaded])

  const handleSubscribe = (plan: (typeof plans)[0]) => {
    if (plan.kasherLink) {
      // Redirect directly to Kashier
      window.location.href = plan.kasherLink
    } else if (plan.paypalId) {
      setSelectedPlan(plan.id)
    } else if (plan.link) {
      window.location.href = plan.link
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-[Cairo]">
      <Script
        src="https://www.paypal.com/sdk/js?client-id=Ac5lY7gFK7C-KTsVZlA0LqFaU4luZiWVKj5tGqC4oy9gITi_1W41rbyNpmvqdGDlWb5GEmgDONR0v3KK&vault=true&intent=subscription"
        data-sdk-integration-source="button-factory"
        onLoad={() => setPaypalLoaded(true)}
      />

      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-12">
          <Link href="/" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
            <Home className="h-5 w-5" />
            <span>الرئيسية</span>
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            اختار باقتك المناسبة
          </h1>
          <p className="text-gray-400 text-lg">ميليجي جاهز يساعدك في كل حاجة تحتاجها</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative bg-gray-900/50 border-gray-800 overflow-hidden transition-all duration-300 hover:scale-105 hover:border-cyan-500/50 flex flex-col ${
                plan.popular ? "ring-2 ring-purple-500" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  الاختيار الذكي
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div
                  className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center`}
                >
                  <plan.icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-white">{plan.name}</CardTitle>
                <p className="text-xs text-gray-500">{plan.nameEn}</p>
                <CardDescription className="text-gray-400 text-sm mt-2">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="text-center flex flex-col flex-1">
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.price !== "0" && <span className="text-gray-400 mr-1">جنيه</span>}
                  <p className="text-sm text-gray-500">{plan.period}</p>
                </div>

                <ul className="space-y-3 mb-6 text-right flex-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {selectedPlan === plan.id && plan.paypalId ? (
                  <div id={`paypal-button-container-${plan.paypalId}`} className="mt-4 min-h-[150px]"></div>
                ) : (
                  <Button
                    onClick={() => handleSubscribe(plan)}
                    disabled={plan.buttonDisabled}
                    className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all ${
                      plan.buttonDisabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {plan.buttonText}
                    {!plan.buttonDisabled && <ArrowRight className="h-4 w-4 mr-2" />}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>جميع الأسعار بالجنيه المصري | الدفع آمن 100%</p>
          <p className="mt-2">
            صنع في مصر بكل حب |
            <Link
              href="https://www.aistudio-vision.com"
              target="_blank"
              className="text-cyan-400 hover:text-cyan-300 mr-1"
            >
              VISION AI STUDIO
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

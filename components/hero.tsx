"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MessageSquare, ArrowDown, Smartphone, Apple, X, Share, PlusSquare } from "lucide-react"
import Link from "next/link"
import { useApp } from "@/lib/contexts/AppContext"

export function Hero() {
  const { translations, language } = useApp()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const [showAppleGuide, setShowAppleGuide] = useState(false)

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("appinstalled", () => setInstalled(true))
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  async function handleAndroidInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") setInstalled(true)
    setDeferredPrompt(null)
  }

  return (
    <section className="container mx-auto px-6 pt-32 pb-20 text-center">
      <div className="flex justify-center mb-12">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-600/30 rounded-full blur-3xl" />
          <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-blue-900/80 to-blue-950/80 backdrop-blur-xl border border-blue-500/30 flex items-center justify-center overflow-hidden">
            <img 
              src="/images/logo.jpg" 
              alt="Melegy Logo" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <h1 className="text-6xl md:text-7xl font-bold text-blue-400 mb-6">{translations.heroTitle}</h1>

      <p
        className="text-2xl md:text-3xl text-white mb-4 font-semibold text-center"
        dir={language === "ar" ? "rtl" : "ltr"}
      >
        {translations.heroSubtitle}
      </p>

      <p className="text-base text-blue-400/80 mb-8">{translations.heroVersion}</p>

      <p className="text-lg text-white/70 mb-12 max-w-3xl mx-auto text-center" dir={language === "ar" ? "rtl" : "ltr"}>
        {translations.heroDescription}
      </p>

      <div className="flex flex-col items-center gap-4">
        <Link href="/chat">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl">
            <MessageSquare className={language === "ar" ? "ml-2 h-5 w-5" : "mr-2 h-5 w-5"} />
            {translations.startChat}
          </Button>
        </Link>

        {/* PWA Install Buttons */}
        <div className="flex gap-3 mt-1" dir="rtl">
          <button
            onClick={handleAndroidInstall}
            disabled={installed}
            className="flex items-center gap-2 bg-gray-900/80 border border-gray-700 hover:border-blue-500 hover:bg-gray-800 text-gray-300 text-sm font-medium rounded-xl px-5 py-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-sm"
          >
            <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
            {installed ? "تم التثبيت" : "تثبيت Android"}
          </button>
          <button
            onClick={() => setShowAppleGuide(true)}
            className="flex items-center gap-2 bg-gray-900/80 border border-gray-700 hover:border-gray-500 hover:bg-gray-800 text-gray-300 text-sm font-medium rounded-xl px-5 py-3 transition-all backdrop-blur-sm"
          >
            <Apple className="w-4 h-4 text-gray-300 shrink-0" />
            تثبيت iPhone
          </button>
        </div>
      </div>

      {/* Apple Guide Modal */}
      {showAppleGuide && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm" dir="rtl">
          <div className="bg-[#0d1117] border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">تثبيت على iPhone</h3>
              <button onClick={() => setShowAppleGuide(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { num: 1, title: "افتح الموقع في Safari", desc: "التثبيت بيشتغل من Safari بس على iPhone", icon: null },
                { num: 2, title: "اضغط زر المشاركة", desc: "الزرار ده في أسفل الشاشة", icon: <Share className="w-5 h-5 text-blue-400 shrink-0" /> },
                { num: 3, title: 'اختار "أضف إلى الشاشة الرئيسية"', desc: "Add to Home Screen", icon: <PlusSquare className="w-5 h-5 text-blue-400 shrink-0" /> },
                { num: 4, title: 'اضغط "إضافة"', desc: "الأداة هتتثبت على شاشتك زي أي تطبيق", icon: null },
              ].map(({ num, title, desc, icon }) => (
                <div key={num} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">{num}</div>
                  <div className="flex items-start gap-2 flex-1">
                    <div>
                      <p className="text-white text-sm font-medium">{title}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
                    </div>
                    {icon}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowAppleGuide(false)}
              className="w-full mt-5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl py-3 text-sm font-medium transition-colors"
            >
              فهمت، شكراً
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        <p className="text-lg text-white/80 font-medium text-center max-w-3xl" dir={language === "ar" ? "rtl" : "ltr"}>
          {translations.heroCta}
        </p>
        <p className="text-base text-white/70 text-center" dir={language === "ar" ? "rtl" : "ltr"}>
          {translations.heroCtaSub}
        </p>
        <ArrowDown className="h-8 w-8 text-cyan-400 animate-bounce drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
      </div>
    </section>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare, ArrowDown, Smartphone, X } from "lucide-react"
import Link from "next/link"
import { useApp } from "@/lib/contexts/AppContext"
import { useEffect, useState, useRef } from "react"

export function Hero() {
  const { translations, language, mounted } = useApp()

  // Use consistent default during SSR to prevent hydration mismatch
  const dir = mounted ? (language === "ar" ? "rtl" : "ltr") : "rtl"
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [showAndroidGuide, setShowAndroidGuide] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const ua = navigator.userAgent
    const ios = /iPhone|iPad|iPod/i.test(ua)
    const android = /Android/i.test(ua)
    setIsIOS(ios)
    setIsAndroid(android)
    // Check if already installed as PWA
    const installed = window.matchMedia("(display-mode: standalone)").matches
    setIsInstalled(installed)

    // Capture Android install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show install banner after 2 seconds
      bannerTimerRef.current = setTimeout(() => setShowBanner(true), 2000)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    }
  }, [])

  const handleAndroidInstall = async () => {
    if (deferredPrompt) {
      setIsInstalling(true)
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === "accepted") {
          setDeferredPrompt(null)
          setShowBanner(false)
          setIsInstalled(true)
        }
      } finally {
        setIsInstalling(false)
      }
    } else {
      // Fallback: show manual install guide for Android
      setShowAndroidGuide(true)
    }
  }

  const isMobile = isIOS || isAndroid

  return (
    <section className="container mx-auto px-6 pt-32 pb-20 text-center">
      {/* PWA Install Banner (Android) */}
      {showBanner && !isInstalled && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-[#1a1f2e] border border-blue-500/40 rounded-2xl p-4 flex items-center gap-3 shadow-2xl shadow-blue-900/40 max-w-sm mx-auto">
          <img src="/images/logo.jpg" alt="Melegy" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          <div className="flex-1 text-right" dir="rtl">
            <p className="text-white font-bold text-sm">حمل تطبيق ميليجي</p>
            <p className="text-slate-400 text-xs">بالمجان على جهازك</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleAndroidInstall}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
              تثبيت
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Android Guide Modal */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-blue-500/30 rounded-2xl p-6 w-full max-w-sm shadow-xl" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-bold text-lg">تثبيت التطبيق على Android</h3>
              <button onClick={() => setShowAndroidGuide(false)} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="bg-blue-600 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                <p className="text-gray-600 dark:text-slate-300 text-sm">افتح التطبيق في متصفح <strong className="text-gray-900 dark:text-white">Chrome</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-600 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                <p className="text-gray-600 dark:text-slate-300 text-sm">اضغط على <strong className="text-gray-900 dark:text-white">النقاط الثلاثة</strong> (القائمة) في أعلى يمين الشاشة</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-600 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                <p className="text-gray-600 dark:text-slate-300 text-sm">اختار <strong className="text-gray-900 dark:text-white">"تثبيت التطبيق"</strong> أو <strong className="text-gray-900 dark:text-white">"Install app"</strong> أو <strong className="text-gray-900 dark:text-white">"Add to Home screen"</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-600 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">4</span>
                <p className="text-gray-600 dark:text-slate-300 text-sm">اضغط <strong className="text-gray-900 dark:text-white">Install</strong> وهيتثبت زي أي تطبيق تاني</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500 dark:text-slate-400 text-center">
              لو مش شايف الخيار، جرب تفتح الموقع في نافذة جديدة أو تأكد إنك بتستخدم Chrome
            </p>
            <button
              onClick={() => setShowAndroidGuide(false)}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors"
            >
              تمام، فهمت
            </button>
          </div>
        </div>
      )}

      {/* iOS Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 flex items-end justify-center p-4">
          <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-blue-500/30 rounded-2xl p-6 w-full max-w-sm shadow-xl" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-bold text-lg">تثبيت التطبيق على iOS</h3>
              <button onClick={() => setShowIOSGuide(false)} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="bg-blue-600 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                <p className="text-gray-600 dark:text-slate-300 text-sm">افتح التطبيق في متصفح <strong className="text-gray-900 dark:text-white">Safari</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-600 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                <p className="text-gray-600 dark:text-slate-300 text-sm">اضغط على زرار <strong className="text-gray-900 dark:text-white">المشاركة</strong> (السهم للأعلى) في أسفل الشاشة</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-600 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                <p className="text-gray-600 dark:text-slate-300 text-sm">اختار <strong className="text-gray-900 dark:text-white">"Add to Home Screen"</strong> أو "أضف للشاشة الرئيسية"</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-600 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">4</span>
                <p className="text-gray-600 dark:text-slate-300 text-sm">اضغط <strong className="text-gray-900 dark:text-white">Add</strong> وهيتثبت زي أي تطبيق تاني</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors"
            >
              تمام، فهمت
            </button>
          </div>
        </div>
      )}

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
        dir={dir}
      >
        {translations.heroSubtitle}
      </p>

      <p className="text-base text-blue-400/80 mb-8">{translations.heroVersion}</p>

      <p className="text-lg text-white/70 mb-12 max-w-3xl mx-auto text-center" dir={dir}>
        {translations.heroDescription}
      </p>

      <div className="flex justify-center">
        <Link href="/chat">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl">
            <MessageSquare className={dir === "rtl" ? "ml-2 h-5 w-5" : "mr-2 h-5 w-5"} />
            {translations.startChat}
          </Button>
        </Link>
      </div>

      {/* Download App Buttons */}
      {!isInstalled && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3" dir="rtl">
          {/* Android */}
          <button
            onClick={handleAndroidInstall}
            disabled={isInstalling}
            className="flex items-center gap-3 bg-white dark:bg-[#1a1f2e] hover:bg-gray-50 dark:hover:bg-[#222840] border border-gray-200 dark:border-slate-700 hover:border-blue-500/70 px-5 py-3 rounded-xl transition-all w-full sm:w-auto justify-center shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-wait"
          >
            {isInstalling ? (
              <>
                <svg className="w-6 h-6 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <span className="text-sm font-bold text-gray-900 dark:text-white">جاري التثبيت...</span>
              </>
            ) : (
              <>
                <svg className="w-7 h-7 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M3.18 23.76a2 2 0 0 0 2.18-.22l12.29-7.1-3.06-3.06-11.41 10.38z" fill="#EA4335"/>
                  <path d="M21.54 10.27a2 2 0 0 0 0 3.46l.02.01-2.34 1.35-3.28-3.28 3.28-3.28 2.32 1.74z" fill="#FBBC04"/>
                  <path d="M3.18.24C2.54.56 2 1.22 2 2.14v19.72c0 .92.54 1.58 1.18 1.9L14.6 12 3.18.24z" fill="#4285F4"/>
                  <path d="M3.18.24l11.41 11.76 3.06-3.06L5.36.46A2 2 0 0 0 3.18.24z" fill="#34A853"/>
                </svg>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">تنزيل مجاني</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Android</p>
                </div>
              </>
            )}
          </button>

          {/* iOS */}
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-3 bg-white dark:bg-[#1a1f2e] hover:bg-gray-50 dark:hover:bg-[#222840] border border-gray-200 dark:border-slate-700 hover:border-blue-500/70 px-5 py-3 rounded-xl transition-all w-full sm:w-auto justify-center shadow-sm hover:shadow-md"
          >
            <svg className="w-7 h-7 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">تنزيل مجاني</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">iPhone / iPad</p>
            </div>
          </button>
        </div>
      )}

      {isInstalled && (
        <div className="mt-6 flex items-center justify-center gap-2 text-green-400 text-sm">
          <Smartphone className="w-4 h-4" />
          <span>التطبيق مثبت على جهازك</span>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        <p className="text-lg text-white/80 font-medium text-center max-w-3xl" dir={dir}>
          {translations.heroCta}
        </p>
        <p className="text-base text-white/70 text-center" dir={dir}>
          {translations.heroCtaSub}
        </p>
        <ArrowDown className="h-8 w-8 text-cyan-400 animate-bounce drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
      </div>
    </section>
  )
}

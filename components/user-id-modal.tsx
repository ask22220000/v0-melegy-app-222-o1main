"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Check, UserPlus, LogIn, Loader2, Smartphone, Apple, X, Share, MoreVertical, PlusSquare } from "lucide-react"

interface UserIdModalProps {
  onUserReady: (userId: string, plan: string, isNew: boolean) => void
}

type View = "choice" | "new-id" | "enter-id"

export function UserIdModal({ onUserReady }: UserIdModalProps) {
  const [view, setView] = useState<View>("choice")
  const [inputId, setInputId] = useState("")
  const [newId, setNewId] = useState("")
  const [plan, setPlan] = useState("free")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showAppleGuide, setShowAppleGuide] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("appinstalled", () => setInstalled(true))
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  async function handleAndroidInstall() {
    if (!deferredPrompt) {
      // Fallback: open in Chrome if not supported
      window.open(window.location.href, "_blank")
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") setInstalled(true)
    setDeferredPrompt(null)
  }

  async function handleCreateNew() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/user", { method: "POST" })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || "حدث خطأ، حاول تاني")
        return
      }
      setNewId(data.user.mlg_user_id)
      setPlan(data.user.plan)
      setView("new-id")
    } catch {
      setError("حدث خطأ في الاتصال بالسيرفر")
    } finally {
      setLoading(false)
    }
  }

  async function handleEnterExisting() {
    if (!inputId.trim()) {
      setError("ادخل الـ ID بتاعك")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/user?id=${inputId.trim()}`)
      const data = await res.json()
      if (res.status === 404) {
        setError("ID مش موجود، تأكد منه وحاول تاني")
        return
      }
      if (!res.ok || data.error) {
        setError(data.error || "حدث خطأ، حاول تاني")
        return
      }
      // Save to localStorage
      localStorage.setItem("mlg_user_id", data.user.mlg_user_id)
      localStorage.setItem("mlg_plan", data.user.plan)
      onUserReady(data.user.mlg_user_id, data.user.plan, false)
    } catch {
      setError("حدث خطأ في الاتصال بالسيرفر")
    } finally {
      setLoading(false)
    }
  }

  function handleCopyAndContinue() {
    navigator.clipboard.writeText(newId).then(() => {
      setCopied(true)
      setTimeout(() => {
        // Save to localStorage then proceed
        localStorage.setItem("mlg_user_id", newId)
        localStorage.setItem("mlg_plan", plan)
        onUserReady(newId, plan, true)
      }, 800)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="bg-[#0d1117] border border-blue-900/40 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/images/logo.jpg" alt="Melegy" className="w-16 h-16 rounded-full object-cover border-2 border-blue-600" />
        </div>

        {/* CHOICE VIEW */}
        {view === "choice" && (
          <div className="flex flex-col gap-4">
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold text-white">ابدأ المحادثة</h2>
              <p className="text-sm text-gray-400 mt-1">كل محادثاتك بتتحفظ تلقائياً بالـ ID بتاعك</p>
            </div>

            <Button
              onClick={handleCreateNew}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-bold rounded-xl flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
              ابدأ جديد — هيتولد لك ID
            </Button>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-gray-500 text-xs">أو</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            <Button
              onClick={() => setView("enter-id")}
              variant="outline"
              className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 py-6 text-base font-bold rounded-xl flex items-center justify-center gap-3"
            >
              <LogIn className="w-5 h-5" />
              عندي ID — هدخل بيه
            </Button>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            {/* PWA Install Buttons */}
            <div className="mt-2 border-t border-gray-800 pt-4 flex flex-col gap-2">
              <p className="text-xs text-gray-500 text-center mb-1">حمّل الأداة على جهازك</p>
              <div className="flex gap-2">
                {/* Android */}
                <button
                  onClick={handleAndroidInstall}
                  disabled={installed}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-900 border border-gray-700 hover:border-blue-600 hover:bg-gray-800 text-gray-300 text-sm font-medium rounded-xl py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  {installed ? "تم التثبيت" : "تثبيت Android"}
                </button>
                {/* Apple */}
                <button
                  onClick={() => setShowAppleGuide(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-900 border border-gray-700 hover:border-gray-500 hover:bg-gray-800 text-gray-300 text-sm font-medium rounded-xl py-3 transition-all"
                >
                  <Apple className="w-4 h-4 text-gray-400" />
                  تثبيت iPhone
                </button>
              </div>
            </div>

            {/* Apple Guide Modal */}
            {showAppleGuide && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm" dir="rtl">
                <div className="bg-[#0d1117] border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold text-lg">تثبيت على iPhone</h3>
                    <button onClick={() => setShowAppleGuide(false)} className="text-gray-500 hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">1</div>
                      <div>
                        <p className="text-white text-sm font-medium">افتح الموقع في Safari</p>
                        <p className="text-gray-400 text-xs mt-0.5">التثبيت بيشتغل من Safari بس على iPhone</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">2</div>
                      <div className="flex items-start gap-2">
                        <div>
                          <p className="text-white text-sm font-medium">اضغط زر المشاركة</p>
                          <p className="text-gray-400 text-xs mt-0.5">الزرار ده في أسفل الشاشة</p>
                        </div>
                        <Share className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">3</div>
                      <div className="flex items-start gap-2">
                        <div>
                          <p className="text-white text-sm font-medium">اختار "أضف إلى الشاشة الرئيسية"</p>
                          <p className="text-gray-400 text-xs mt-0.5">Add to Home Screen</p>
                        </div>
                        <PlusSquare className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">4</div>
                      <div>
                        <p className="text-white text-sm font-medium">اضغط "إضافة"</p>
                        <p className="text-gray-400 text-xs mt-0.5">الأداة هتتثبت على شاشتك زي أي تطبيق</p>
                      </div>
                    </div>
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
          </div>
        )}

        {/* NEW ID VIEW */}
        {view === "new-id" && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">معرفك الشخصي</h2>
              <p className="text-sm text-red-400 mt-1 font-medium">احفظ الـ ID دا — محتاجه عشان ترجع لمحادثاتك</p>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
              <span className="text-blue-400 font-mono text-lg font-bold flex-1 text-center tracking-widest">
                {newId}
              </span>
            </div>

            <p className="text-xs text-gray-500 text-center">
              لو نسيته، مش هتقدر ترجع لمحادثاتك القديمة. احتفظ بيه في مكان آمن.
            </p>

            <Button
              onClick={handleCopyAndContinue}
              disabled={copied}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 text-base font-bold rounded-xl flex items-center justify-center gap-3"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 text-green-400" />
                  تم النسخ — جاري الدخول...
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  انسخ الـ ID وابدأ
                </>
              )}
            </Button>
          </div>
        )}

        {/* ENTER EXISTING ID VIEW */}
        {view === "enter-id" && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">ادخل الـ ID بتاعك</h2>
              <p className="text-sm text-gray-400 mt-1">هتلاقي كل محادثاتك القديمة</p>
            </div>

            <Input
              value={inputId}
              onChange={(e) => { setInputId(e.target.value); setError("") }}
              placeholder="mlg-xxxxxxxxxxxx"
              className="bg-gray-900 border-gray-700 text-white text-center font-mono text-base py-6 rounded-xl"
              dir="ltr"
              onKeyDown={(e) => e.key === "Enter" && handleEnterExisting()}
            />

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <Button
              onClick={handleEnterExisting}
              disabled={loading || !inputId.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 text-base font-bold rounded-xl flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              دخول
            </Button>

            <button
              onClick={() => { setView("choice"); setError(""); setInputId("") }}
              className="text-gray-500 text-sm text-center hover:text-gray-300 transition-colors"
            >
              رجوع
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

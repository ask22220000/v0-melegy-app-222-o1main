"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Check, UserPlus, LogIn, Loader2 } from "lucide-react"

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

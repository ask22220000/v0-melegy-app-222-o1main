"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"

interface AuthModalProps {
  onSuccess?: () => void
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("signup")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const supabase = createClient()
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        setSuccess("تحقق من بريدك الإلكتروني لتأكيد الحساب")
        setEmail("")
        setPassword("")
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        setSuccess("تم تسجيل الدخول بنجاح!")
        setTimeout(() => {
          router.push("/chat")
          onSuccess?.()
        }, 1000)
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ في المحاولة")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div
        className="bg-[#0f1419] border border-blue-500/30 rounded-2xl p-8 w-full max-w-md"
        dir="rtl"
      >
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-900 to-blue-950 border border-blue-500/30 flex items-center justify-center overflow-hidden">
            <img
              src="/images/logo.jpg"
              alt="Melegy"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">
          {mode === "signup" ? "أبدأ المحادثة" : "تسجيل الدخول"}
        </h2>
        <p className="text-slate-400 text-center text-sm mb-6">
          {mode === "signup"
            ? "احفظ محادثاتك ووصول آمن من أي جهاز"
            : "رحباً بعودتك!"}
        </p>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-500/30 text-green-400 text-sm p-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {loading
              ? mode === "signup"
                ? "جاري الإنشاء..."
                : "جاري تسجيل الدخول..."
              : mode === "signup"
              ? "إنشاء حساب"
              : "تسجيل الدخول"}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#0f1419] text-slate-400">أو</span>
          </div>
        </div>

        <button
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup")
            setError("")
            setSuccess("")
          }}
          className="w-full border border-slate-600 hover:border-blue-500/50 text-slate-300 hover:text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {mode === "signup"
            ? "عندي حساب بالفعل؟ تسجيل دخول"
            : "ليس عندي حساب؟ إنشاء حساب"}
        </button>
      </div>
    </div>
  )
}

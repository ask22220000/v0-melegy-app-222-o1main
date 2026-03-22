"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("كلمات المرور غير متطابقة")
      return
    }

    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "فشل التسجيل")
        return
      }

      // Store token in localStorage
      localStorage.setItem("authToken", data.token)
      localStorage.setItem("userId", data.userId)

      router.push("/chat")
    } catch (err) {
      setError("حدث خطأ في الاتصال بالسيرفر")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1117] to-[#1a1f2e] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="bg-[#0d1117] border border-blue-900/40 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src="/images/logo.jpg" alt="Melegy" className="w-16 h-16 rounded-full object-cover border-2 border-blue-600" />
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-2">إنشاء حساب جديد</h1>
          <p className="text-gray-400 text-center text-sm mb-8">انضم إلى ميليجي الآن</p>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">البريد الإلكتروني</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">كلمة المرور</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">تأكيد كلمة المرور</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <Button
              type="submit"
              disabled={loading || !email || !password || !confirmPassword}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-bold rounded-xl flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {loading ? "جاري التسجيل..." : "إنشاء حساب"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              هل لديك حساب بالفعل؟{" "}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                تسجيل دخول
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

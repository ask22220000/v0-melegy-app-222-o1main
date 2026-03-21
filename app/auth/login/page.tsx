/* eslint-disable */
// @ts-nocheck
"use client"

import React, { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Mail, Lock, LogIn } from "lucide-react"

function LoginContent() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      router.push("/chat")
    } catch (err) {
      setError("حدث خطأ غير متوقع!")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0b1a] px-4" dir="rtl">
      <div className="w-full max-w-md space-y-8">
        <div className="bg-[#0d1117] border border-blue-900/40 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <LogIn className="mx-auto h-12 w-12 text-blue-500 mb-4" />
            <h1 className="text-3xl font-bold text-white">تسجيل الدخول</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <Input
                type="email"
                placeholder="الإيميل"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white pr-10 h-12 placeholder-gray-400 focus:border-blue-500"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <Input
                type="password"
                placeholder="كلمة السر"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white pr-10 h-12 placeholder-gray-400 focus:border-blue-500"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-xl text-red-300 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 h-12 font-bold text-lg shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                "دخول"
              )}
            </Button>
          </form>

          <div className="text-center pt-6 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              مش عندك حساب؟
              <Link href="/auth/sign-up" className="text-blue-400 font-semibold hover:text-blue-300 ml-1">
                سجل دلوقتي
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0b1a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
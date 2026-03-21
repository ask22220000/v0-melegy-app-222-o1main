 v0/ask22220000-6eeef137
'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Page() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/protected`,
        },
      })
      if (error) throw error
      router.push('/protected')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)

"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Mail, Lock, LogIn } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectedFrom = searchParams.get("redirectedFrom") || "/chat"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("الإيميل أو كلمة السر غلط، حاول تاني")
        } else if (authError.message.includes("Email not confirmed")) {
          setError("لازم تأكد إيميلك الأول. فحص صندوق الإيميل بتاعك.")
        } else {
          setError(authError.message)
        }
        return
      }

      router.push(redirectedFrom)
      router.refresh()
    } catch {
      setError("حدث خطأ في الاتصال، حاول تاني")
    } finally {
      setLoading(false)
 main
    }
  }

  return (
 v0/ask22220000-6eeef137
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Login</CardTitle>
              <CardDescription>
                Enter your email below to login to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/auth/sign-up"
                    className="underline underline-offset-4"
                  >
                    Sign up
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

    <div
      className="min-h-screen flex items-center justify-center bg-[#0a0b1a] px-4"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/images/logo.jpg"
            alt="Melegy"
            className="w-20 h-20 rounded-full object-cover border-2 border-blue-600 shadow-lg shadow-blue-600/30"
          />
        </div>

        <div className="bg-[#0d1117] border border-blue-900/40 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">تسجيل الدخول</h1>
            <p className="text-gray-400 text-sm mt-1">ادخل بحسابك على ميليجي</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <Input
                type="email"
                placeholder="الإيميل"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError("") }}
                required
                dir="ltr"
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 pr-10 py-5 rounded-xl focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <Input
                type="password"
                placeholder="كلمة السر"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError("") }}
                required
                dir="ltr"
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 pr-10 py-5 rounded-xl focus:border-blue-500 focus:ring-blue-500"
                onKeyDown={(e) => e.key === "Enter" && handleLogin(e as any)}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 text-base font-bold rounded-xl flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              دخول
            </Button>
          </form>

          <div className="relative flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-gray-500 text-xs">أو</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <div className="text-center">
            <p className="text-gray-400 text-sm">
              مش عندك حساب؟{" "}
              <Link href="/auth/sign-up" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                سجّل دلوقتي
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Melegy AI — صنع في مصر
        </p>
 main
      </div>
    </div>
  )
}

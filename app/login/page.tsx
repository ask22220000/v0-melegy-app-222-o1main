'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Script from 'next/script'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (element: HTMLElement, config: any) => void
        }
      }
    }
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { logIn, signInWithGoogle, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const initializeGoogle = () => {
      if (window.google && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        })
        
        const buttonEl = document.getElementById('google-signin-button-login')
        if (buttonEl) {
          window.google.accounts.id.renderButton(buttonEl, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            locale: 'ar',
          })
        }
      } else {
        console.warn('[v0] Google SDK or Client ID not available')
      }
    }

    if (window.google) {
      initializeGoogle()
    } else {
      window.addEventListener('load', initializeGoogle)
      return () => window.removeEventListener('load', initializeGoogle)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await logIn(email, password)
      toast.success('تم تسجيل الدخول بنجاح')
      router.push('/')
    } catch (err) {
      toast.error(error || 'فشل تسجيل الدخول')
    }
  }

  const handleGoogleCallback = async (response: any) => {
    try {
      const token = response.credential
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      const decoded = JSON.parse(jsonPayload)

      console.log('[v0] Google login callback received:', decoded)

      await signInWithGoogle(
        decoded.sub,
        decoded.email,
        decoded.given_name,
        decoded.family_name
      )

      toast.success('تم تسجيل الدخول بنجاح عبر Google')
      router.push('/')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'فشل تسجيل الدخول عبر Google'
      toast.error(errorMessage)
      console.error('[v0] Google login error:', err)
    }
  }



  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
              <div className="w-8 h-8 bg-primary rounded"></div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">تسجيل الدخول</h1>
            <p className="text-muted-foreground mt-2">دخول إلى حسابك</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                البريد الإلكتروني
              </label>
              <Input
                type="email"
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                كلمة المرور
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-600 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">أو</span>
            </div>
          </div>

          <div id="google-signin-button-login" className="w-full flex justify-center" />

          {/* Fallback button if Google SDK doesn't load */}
          <Button
            type="button"
            variant="outline"
            className="w-full hidden"
            disabled={loading}
          >
            <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            تسجيل الدخول عبر Google
          </Button>

          <div className="text-center mt-6">
            <p className="text-muted-foreground">
              ليس لديك حساب؟{' '}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                إنشاء حساب جديد
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Script 
        src="https://accounts.google.com/gsi/client" 
        async 
        defer
      />
    </div>
  )
}

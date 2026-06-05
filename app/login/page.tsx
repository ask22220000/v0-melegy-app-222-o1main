/**
 * app/login/page.tsx — Login page
 */
import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'تسجيل الدخول - Melegy',
  description: 'تسجيل الدخول إلى حسابك في Melegy',
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">تسجيل الدخول</h1>
          <p className="text-muted-foreground">مرحباً بك في Melegy</p>
        </div>

        {/* Login Form */}
        <LoginForm />
      </div>
    </main>
  )
}

/**
 * app/signup/page.tsx — Signup page
 */
import type { Metadata } from 'next'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata: Metadata = {
  title: 'إنشاء حساب - Melegy',
  description: 'إنشاء حساب جديد في Melegy',
}

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">إنشاء حساب</h1>
          <p className="text-muted-foreground">ابدأ رحلتك مع Melegy اليوم</p>
        </div>

        {/* Signup Form */}
        <SignupForm />
      </div>
    </main>
  )
}

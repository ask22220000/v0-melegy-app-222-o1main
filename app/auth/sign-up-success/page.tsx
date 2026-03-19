"use client"

import Link from "next/link"
import { MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SignUpSuccessPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#0a0b1a] px-4"
      dir="rtl"
    >
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/images/logo.jpg"
            alt="Melegy"
            className="w-20 h-20 rounded-full object-cover border-2 border-blue-600 shadow-lg shadow-blue-600/30"
          />
        </div>

        <div className="bg-[#0d1117] border border-blue-900/40 rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-center mb-5">
            <div className="bg-blue-600/20 border border-blue-600/40 rounded-full p-4">
              <MailCheck className="w-10 h-10 text-blue-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">تم إنشاء الحساب!</h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-2">
            بعتنالك إيميل تأكيد على بريدك الإلكتروني.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            افتح الإيميل واضغط على رابط التأكيد عشان تكمّل وتبدأ تستخدم ميليجي.
          </p>

          <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-4 mb-6">
            <p className="text-amber-400 text-sm font-medium">
              لو ماوصلكش الإيميل — فحص مجلد الـ Spam
            </p>
          </div>

          <Link href="/auth/login">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 text-base font-bold rounded-xl">
              الذهاب لصفحة تسجيل الدخول
            </Button>
          </Link>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Melegy AI — صنع في مصر
        </p>
      </div>
    </div>
  )
}

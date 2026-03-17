"use client"

import dynamic from "next/dynamic"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { useApp } from "@/lib/contexts/AppContext"

// Dynamic imports with ssr: false to prevent hydration mismatch with Arabic text
const Header = dynamic(() => import("@/components/header").then(mod => ({ default: mod.Header })), { ssr: false })
const Hero = dynamic(() => import("@/components/hero").then(mod => ({ default: mod.Hero })), { ssr: false })
const Features = dynamic(() => import("@/components/features").then(mod => ({ default: mod.Features })), { ssr: false })

export default function HomePage() {
  const { translations, language, mounted } = useApp()

  const dir = language === "ar" ? "rtl" : "ltr"

  return (
    <div className="min-h-screen bg-background homepage-dark-bg" dir="rtl" suppressHydrationWarning>
      <Header />
      <Hero />
      <Features />
      <div className="container mx-auto px-6 py-8 text-center" suppressHydrationWarning>
        <Link
          href="/pricing"
          className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 px-8 rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
          suppressHydrationWarning
        >
          {mounted ? translations.pricingLink : ""}
        </Link>
      </div>
      <Footer />
    </div>
  )
}

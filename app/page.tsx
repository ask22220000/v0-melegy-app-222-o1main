"use client"

import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { useApp } from "@/lib/contexts/AppContext"

export default function HomePage() {
  const { translations, language } = useApp()

  return (
    <div className="min-h-screen bg-background homepage-dark-bg" dir={language === "ar" ? "rtl" : "ltr"}>
      <Header />
      <Hero />
      <Features />
      <div className="container mx-auto px-6 py-8 text-center">
        <Link
          href="/pricing"
          className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 px-8 rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
        >
          {translations.pricingLink}
        </Link>
      </div>
      <Footer />
    </div>
  )
}

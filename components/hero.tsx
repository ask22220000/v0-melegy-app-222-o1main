"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare, ArrowDown } from "lucide-react"
import Link from "next/link"
import { useApp } from "@/lib/contexts/AppContext"

export function Hero() {
  const { translations, language } = useApp()

  return (
    <section className="container mx-auto px-6 pt-32 pb-20 text-center">
      <div className="flex justify-center mb-12">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-600/30 rounded-full blur-3xl" />
          <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-blue-900/80 to-blue-950/80 backdrop-blur-xl border border-blue-500/30 flex items-center justify-center overflow-hidden">
            <img 
              src="/images/logo.jpg" 
              alt="Melegy Logo" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <h1 className="text-6xl md:text-7xl font-bold text-blue-400 mb-6">{translations.heroTitle}</h1>

      <p
        className="text-2xl md:text-3xl text-white mb-4 font-semibold text-center"
        dir={language === "ar" ? "rtl" : "ltr"}
      >
        {translations.heroSubtitle}
      </p>

      <p className="text-base text-blue-400/80 mb-8">{translations.heroVersion}</p>

      <p className="text-lg text-white/70 mb-12 max-w-3xl mx-auto text-center" dir={language === "ar" ? "rtl" : "ltr"}>
        {translations.heroDescription}
      </p>

      <div className="flex justify-center">
        <Link href="/chat">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl">
            <MessageSquare className={language === "ar" ? "ml-2 h-5 w-5" : "mr-2 h-5 w-5"} />
            {translations.startChat}
          </Button>
        </Link>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <p className="text-lg text-white/80 font-medium text-center max-w-3xl" dir={language === "ar" ? "rtl" : "ltr"}>
          {translations.heroCta}
        </p>
        <p className="text-base text-white/70 text-center" dir={language === "ar" ? "rtl" : "ltr"}>
          {translations.heroCtaSub}
        </p>
        <ArrowDown className="h-8 w-8 text-cyan-400 animate-bounce drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
      </div>
    </section>
  )
}

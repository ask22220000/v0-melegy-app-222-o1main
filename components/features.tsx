"use client"

import { ImageIcon } from "lucide-react"
import { useApp } from "@/lib/contexts/AppContext"

export function Features() {
  const { translations, language, mounted } = useApp()

  // Prevent hydration mismatch by using consistent default during SSR
  const dir = mounted ? (language === "ar" ? "rtl" : "ltr") : "rtl"

  const features = [
    { icon: "🖼️", key: "imageAnalysis" as const },
    { icon: "🔍", key: "deepSearch" as const },
    { icon: "🧠", key: "mindMaps" as const },
    { icon: "✨", key: "ideaToPrompt" as const },
    { icon: "💬", key: "adaptiveCommunication" as const },
    { icon: "💡", key: "creativeSolving" as const },
    { icon: "🎨", key: "imageGeneration" as const },
    { icon: "📊", key: "spreadsheets" as const },
    { icon: "🤔", key: "deepThinking" as const },
  ]

  return (
    <section className="container mx-auto px-6 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {features.map((feature, index) => {
          const featureText = translations.features[feature.key]
          return (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-slate-900/50 to-slate-950/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 hover:scale-105"
            >
              <div className="text-5xl mb-4">
                {feature.icon === "🖼️" ? <ImageIcon className="h-12 w-12 text-blue-400" /> : feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3" dir={dir}>
                {featureText.title}
              </h3>
              <p className="text-white/60 leading-relaxed" dir={dir}>
                {featureText.description}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

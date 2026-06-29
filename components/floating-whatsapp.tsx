"use client"

import { MessageCircle, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useApp } from "@/lib/contexts/AppContext"

export function FloatingWhatsApp() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { translations } = useApp()

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {isExpanded ? (
        <div className="bg-green-600 text-white rounded-lg shadow-2xl p-4 w-64 animate-slide-in-from-bottom">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold text-sm">{translations.whatsappSupport}</span>
            </div>
            <button onClick={() => setIsExpanded(false)} className="hover:bg-green-700 rounded p-1 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs mb-3 text-green-100">{translations.whatsappMessage}</p>
          <Link
            href="https://wa.me/201552537557"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-white text-green-600 hover:bg-green-50 text-center py-2 rounded-md text-sm font-medium transition-colors"
          >
            {translations.startChat}
          </Link>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 animate-bounce"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}

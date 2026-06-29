"use client"

import { Linkedin, Instagram, Facebook, MessageCircle } from "lucide-react"
import Link from "next/link"
import { useApp } from "@/lib/contexts/AppContext"

export function Footer() {
  const { translations } = useApp()

  return (
    <footer className="container mx-auto px-6 py-12 border-t border-slate-800/50">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="https://wa.me/201552537557"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:text-green-300 transition-colors"
            title={translations.whatsappSupport}
          >
            <MessageCircle className="h-5 w-5" />
          </Link>
          <Link
            href="https://x.com/Josephibrahim50"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </Link>
          <Link
            href="https://www.linkedin.com/in/joseph-ibrahim1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <Linkedin className="h-5 w-5" />
          </Link>
          <Link
            href="https://www.instagram.com/vision.ai.studio_eg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <Instagram className="h-5 w-5" />
          </Link>
          <Link
            href="https://www.facebook.com/aistudiovision"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <Facebook className="h-5 w-5" />
          </Link>
        </div>

        <div className="text-center">
          <div className="flex gap-4 mb-2 justify-center">
            <Link href="/pricing" className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-bold">
              {translations.footerPricing}
            </Link>
          </div>
          <p className="text-slate-400 text-sm" suppressHydrationWarning>
            <Link
              href="https://www.aistudio-vision.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors"
            >
              VISION AI STUDIO
            </Link>{" "}
            | {translations.madeInEgypt}
          </p>
          <p className="text-slate-500 text-xs mt-1">By Joseph Ibrahim</p>
        </div>
      </div>
    </footer>
  )
}

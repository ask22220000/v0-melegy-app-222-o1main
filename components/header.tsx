"use client"

import { MessageSquare, Home, Moon, Sun, Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApp } from "@/lib/contexts/AppContext"
import Link from "next/link"
import { useState, useEffect } from "react"

type HeaderProps = {
  showChatHistory?: boolean
  onChatHistoryClick?: () => void
  showHomeButton?: boolean
}

export function Header({ showChatHistory = false, onChatHistoryClick, showHomeButton = false }: HeaderProps) {
  const { translations, language, setLanguage } = useApp()
  // Default to "dark" — synced from localStorage after mount so no flash
  const [theme, setTheme] = useState<"light" | "dark">("dark")

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "light" | "dark") || "dark"
    setTheme(saved)
    document.documentElement.classList.toggle("dark", saved === "dark")
  }, [])

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem("theme", next)
    document.documentElement.classList.toggle("dark", next === "dark")
  }

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar")
  }

  return (
    <>
      {/* Language toggle — physically pinned to top-LEFT, immune to dir="rtl" */}
      <div
        className="fixed z-50"
        style={{ top: "12px", left: "12px" }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="bg-card backdrop-blur-md border-2 border-cyan-500/70 text-cyan-400 hover:text-cyan-300 hover:border-cyan-400 flex items-center gap-1 font-bold px-2 h-8"
          aria-label={language === "ar" ? "Switch to English" : "Switch to Arabic"}
        >
          <Languages className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs leading-none">{translations.languageToggle}</span>
        </Button>
      </div>

      {/* Theme + nav buttons — physically pinned to top-RIGHT */}
      <div
        dir="ltr"
        className="fixed z-50 flex items-center gap-2"
        style={{ top: "12px", right: "12px" }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="bg-card backdrop-blur-md border-border/50 flex items-center gap-2 text-foreground hover:text-foreground h-8 px-2"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>

        {showHomeButton && (
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="bg-background/20 backdrop-blur-md border-border/50 flex items-center gap-2 text-white hover:text-white h-8 px-2"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">{translations.home}</span>
            </Button>
          </Link>
        )}

        {showChatHistory && (
          <Button
            variant="outline"
            size="sm"
            onClick={onChatHistoryClick}
            className="bg-background/20 backdrop-blur-md border-border/50 flex items-center gap-2 text-white hover:text-white h-8 px-2"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">{translations.history}</span>
          </Button>
        )}
      </div>
    </>
  )
}

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
  const { translations, language, setLanguage, mounted } = useApp()
  // Default to "dark" — synced from localStorage after mount so no flash
  const [theme, setTheme] = useState<"light" | "dark">("dark")

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "light" | "dark") || "dark"
    setTheme(saved)
    document.documentElement.classList.toggle("dark", saved === "dark")
  }, [])

  // Return null during SSR to prevent hydration mismatch
  if (!mounted) {
    return null
  }

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
      {/* Fixed button row — uses inline style for physical left so RTL cannot flip it */}
      <div
        dir="ltr"
        className="fixed z-50 flex items-center gap-2"
        style={{ top: "16px", left: "16px" }}
      >
        {/* Theme toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="bg-card backdrop-blur-md border-border/50 flex items-center gap-2 text-foreground hover:text-foreground"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Language toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="bg-card backdrop-blur-md border-2 border-cyan-500/70 text-cyan-400 hover:text-cyan-300 hover:border-cyan-400 flex items-center gap-1.5 font-bold min-w-[52px]"
          aria-label={language === "ar" ? "Switch to English" : "Switch to Arabic"}
        >
          <Languages className="h-4 w-4 shrink-0" />
          <span className="text-xs">{translations.languageToggle}</span>
        </Button>

        {showHomeButton && (
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="bg-background/20 backdrop-blur-md border-border/50 flex items-center gap-2 text-white hover:text-white"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">{translations.home}</span>
            </Button>
          </Link>
        )}

        {showChatHistory && (
          <Button
            variant="outline"
            size="sm"
            onClick={onChatHistoryClick}
            className="bg-background/20 backdrop-blur-md border-border/50 flex items-center gap-2 text-white hover:text-white"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">{translations.history}</span>
          </Button>
        )}
      </div>
    </>
  )
}

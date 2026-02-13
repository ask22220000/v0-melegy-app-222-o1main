"use client"

import { useEffect, useState } from "react"
import { getUsageStats, PLAN_LIMITS } from "@/lib/usage-tracker"
import { MessageSquare, Image, Sparkles } from "lucide-react"
import Link from "next/link"

export function UsageIndicator() {
  const [stats, setStats] = useState<ReturnType<typeof getUsageStats> | null>(null)

  useEffect(() => {
    // Initial load
    setStats(getUsageStats())

    // Update every 5 seconds
    const interval = setInterval(() => {
      setStats(getUsageStats())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  if (!stats) return null

  const messagesUnlimited = stats.messages.limit === -1
  const imagesUnlimited = stats.images.limit === -1

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-500" />
          <span className="text-sm font-bold text-foreground">خطة {stats.planName}</span>
        </div>
        {stats.plan === 'free' && (
          <Link href="/pricing" className="text-xs text-cyan-500 hover:underline">
            ترقية
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {/* Messages */}
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">الرسائل</span>
              <span className="text-foreground font-medium">
                {messagesUnlimited ? "غير محدود" : `${stats.messages.used}/${stats.messages.limit}`}
              </span>
            </div>
            {!messagesUnlimited && (
              <div className="w-full bg-secondary rounded-full h-1.5 mt-1">
                <div
                  className="bg-cyan-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${(stats.messages.used / stats.messages.limit) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Images */}
        <div className="flex items-center gap-2">
          <Image className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">الصور</span>
              <span className="text-foreground font-medium">
                {imagesUnlimited ? "غير محدود" : `${stats.images.used}/${stats.images.limit}`}
              </span>
            </div>
            {!imagesUnlimited && (
              <div className="w-full bg-secondary rounded-full h-1.5 mt-1">
                <div
                  className="bg-purple-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${(stats.images.used / stats.images.limit) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

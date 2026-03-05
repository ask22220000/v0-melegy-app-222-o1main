"use client"

import { useEffect, useState } from "react"
import { getUsageStats } from "@/lib/usage-tracker"
import { MessageSquare, Image, Film, Mic, Sparkles } from "lucide-react"
import Link from "next/link"

type StatsShape = Awaited<ReturnType<typeof getUsageStats>>

type StatRow = {
  icon: React.ReactNode
  label: string
  used: number
  limit: number
  color: string
}

export function UsageIndicator() {
  const [stats, setStats] = useState<StatsShape | null>(null)

  useEffect(() => {
    const load = async () => setStats(await getUsageStats())
    load()
    const interval = setInterval(load, 15_000)
    return () => clearInterval(interval)
  }, [])

  if (!stats) return null

  const rows: StatRow[] = [
    {
      icon: <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />,
      label: "الرسائل",
      used: stats.messages.used,
      limit: stats.messages.limit,
      color: "bg-cyan-500",
    },
    {
      icon: <Image className="h-3.5 w-3.5 text-muted-foreground" />,
      label: "الصور",
      used: stats.images.used,
      limit: stats.images.limit,
      color: "bg-purple-500",
    },
    {
      icon: <Film className="h-3.5 w-3.5 text-muted-foreground" />,
      label: "الفيديو",
      used: stats.video.used,
      limit: stats.video.limit,
      color: "bg-orange-500",
    },
    {
      icon: <Mic className="h-3.5 w-3.5 text-muted-foreground" />,
      label: "الصوت (دقيقة)",
      used: Math.floor(stats.voice.used),
      limit: stats.voice.limit,
      color: "bg-green-500",
    },
  ]

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-500" />
          <span className="text-sm font-bold text-foreground">خطة {stats.planName}</span>
        </div>
        {stats.plan === "free" && (
          <Link href="/pricing" className="text-xs text-cyan-500 hover:underline">
            ترقية
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const unlimited = row.limit === -1
          const pct = unlimited ? 0 : Math.min((row.used / row.limit) * 100, 100)
          return (
            <div key={row.label} className="flex items-center gap-2">
              {row.icon}
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="text-foreground font-medium">
                    {unlimited ? "غير محدود" : `${row.used}/${row.limit}`}
                  </span>
                </div>
                {!unlimited && (
                  <div className="w-full bg-secondary rounded-full h-1.5 mt-1">
                    <div
                      className={`${row.color} h-1.5 rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

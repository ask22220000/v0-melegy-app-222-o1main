"use client"

import dynamic from "next/dynamic"

// Dynamic import with ssr: false to completely prevent server-side rendering
// This fixes hydration mismatch caused by Arabic text encoding differences between server and client
const HomeContent = dynamic(
  () => import("@/components/home-content").then((mod) => mod.HomeContent),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-background homepage-dark-bg flex items-center justify-center" dir="rtl">
        <div className="animate-pulse text-white/50">جاري التحميل...</div>
      </div>
    )
  }
)

export default function HomePage() {
  return <HomeContent />
}

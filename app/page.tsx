import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import dynamic from "next/dynamic"

const HomeContent = dynamic(
  () => import("@/components/home-content").then((mod) => mod.HomeContent),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-background homepage-dark-bg flex items-center justify-center" dir="rtl">
        <div className="animate-pulse text-white/50">جاري التحميل...</div>
      </div>
    ),
  }
)

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  // If user is already logged in, send them to /chat
  if (data.user) {
    redirect("/chat")
  }

  // Otherwise show the landing page
  return <HomeContent />
}

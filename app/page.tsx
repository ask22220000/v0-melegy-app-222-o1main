import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { HomeContent } from "@/components/home-content"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (data.user) {
    redirect("/chat")
  }

  return <HomeContent />
}

"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { HomeContent } from "@/components/home-content"

export default function HomePage() {
  const router = useRouter()
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data?.user) router.replace("/chat")
    })
  }, [router])
  return <HomeContent />
}

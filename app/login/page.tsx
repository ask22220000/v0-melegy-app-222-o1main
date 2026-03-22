"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { UserIdModal } from "@/components/user-id-modal"

export default function LoginPage() {
  const router = useRouter()

  // If already logged in, go straight to chat
  useEffect(() => {
    const storedId = localStorage.getItem("mlg_user_id")
    if (storedId) {
      router.replace("/chat")
    }
  }, [router])

  function handleUserReady(userId: string, plan: string, isNew: boolean) {
    localStorage.setItem("mlg_user_id", userId)
    localStorage.setItem("mlg_plan", plan)
    router.replace("/chat")
  }

  return (
    <div className="min-h-screen bg-[#0a0b1a]">
      <UserIdModal onUserReady={handleUserReady} />
    </div>
  )
}

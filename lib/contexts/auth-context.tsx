"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface User {
  id: string
  email?: string
}

interface Profile {
  id: string
  email: string
  plan_name: string
  plan_expires_at?: string
  total_messages: number
  total_conversations: number
}

interface Subscription {
  id: string
  plan_name: string
  status: string
  expires_at?: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  subscription: Subscription | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  const refreshUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUser({ id: user.id, email: user.email })

        const res = await fetch("/api/user-profile")
        if (res.ok) {
          const data = await res.json()
          setProfile(data.profile)
          setSubscription(data.subscription)
        }
      } else {
        setUser(null)
        setProfile(null)
        setSubscription(null)
      }
    } catch (error) {
      console.error("Error refreshing user:", error)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSubscription(null)
    router.push("/")
  }

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser({ id: session.user.id, email: session.user.email })
        await refreshUser()
      } else {
        setUser(null)
        setProfile(null)
        setSubscription(null)
      }
      setLoading(false)
    })

    return () => subscription?.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, subscription, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}

"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type User = {
  id: string
  email: string
  firstName?: string
  lastName?: string
}

type AuthContextType = {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/user")
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } catch (err) {
        console.error("[v0] Auth check failed:", err)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "فشل تسجيل الدخول")
      }

      const data = await response.json()
      setUser(data.user)
      localStorage.setItem("auth_token", data.token)
    } catch (err) {
      const message = err instanceof Error ? err.message : "فشل تسجيل الدخول"
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signup = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      setError(null)
      setLoading(true)
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName, lastName }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "فشل إنشاء الحساب")
      }

      const data = await response.json()
      setUser(data.user)
      localStorage.setItem("auth_token", data.token)
    } catch (err) {
      const message = err instanceof Error ? err.message : "فشل إنشاء الحساب"
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      setUser(null)
      localStorage.removeItem("auth_token")
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (err) {
      console.error("[v0] Logout error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}

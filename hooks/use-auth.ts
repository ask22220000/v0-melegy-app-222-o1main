import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface AuthUser {
  id: string
  email: string
  plan: string
}

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("authToken")
      const userId = localStorage.getItem("userId")
      const userEmail = localStorage.getItem("userEmail")
      const userPlan = localStorage.getItem("userPlan")

      if (token && userId) {
        setUser({
          id: userId,
          email: userEmail || "",
          plan: userPlan || "free",
        })
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (err) {
      console.error("[v0] Logout error:", err)
    } finally {
      localStorage.removeItem("authToken")
      localStorage.removeItem("userId")
      localStorage.removeItem("userEmail")
      localStorage.removeItem("userPlan")
      setUser(null)
      setIsAuthenticated(false)
      router.push("/login")
    }
  }

  return { user, loading, isAuthenticated, logout }
}

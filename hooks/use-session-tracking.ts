"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

// Generate unique session ID
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

// Get or create session ID from sessionStorage
function getSessionId() {
  if (typeof window === "undefined") return null

  let sessionId = sessionStorage.getItem("melegy_session_id")
  if (!sessionId) {
    sessionId = generateSessionId()
    sessionStorage.getItem("melegy_session_id")
    sessionStorage.setItem("melegy_session_id", sessionId)
  }
  return sessionId
}

function generateUserFingerprint() {
  if (typeof window === "undefined") return "unknown"

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  ctx?.fillText("fingerprint", 10, 10)

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join("|")

  // Simple hash
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return "fp_" + Math.abs(hash).toString(36)
}

export function useSessionTracking() {
  const pathname = usePathname()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const sessionId = getSessionId()
    if (!sessionId) return

    const userFingerprint = generateUserFingerprint()

    // Track session immediately
    const trackSession = async () => {
      try {
        await fetch("/api/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "trackSession",
            data: {
              sessionId,
              pagePath: pathname,
              deviceInfo: navigator.userAgent,
              userFingerprint,
            },
          }),
        }).catch(() => {
          // Silently fail - don't disrupt user experience
        })
      } catch (error) {
        // Silently fail - don't log to console
      }
    }

    // Track immediately on mount/path change with small delay to avoid blocking
    const timeoutId = setTimeout(trackSession, 500)

    // Ping every 30 seconds to keep session active
    intervalRef.current = setInterval(trackSession, 30000)

    return () => {
      clearTimeout(timeoutId)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [pathname])
}

// Track user for total users count
export async function trackUser() {
  if (typeof window === "undefined") return

  try {
    const userFingerprint = generateUserFingerprint()

    await fetch("/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "trackUser",
        data: {
          userFingerprint,
          deviceInfo: navigator.userAgent,
        },
      }),
    })
  } catch (error) {
    // Silently fail
  }
}

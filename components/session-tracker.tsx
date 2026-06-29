"use client"

import { useSessionTracking, trackUser } from "@/hooks/use-session-tracking"
import { useEffect } from "react"

export function SessionTracker() {
  useSessionTracking()

  useEffect(() => {
    // Track user on first visit
    trackUser()
  }, [])

  return null
}

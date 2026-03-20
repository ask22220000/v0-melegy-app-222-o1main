"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    // Register the service worker
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        // Check for updates every time the page loads
        registration.update()

        // When a new SW is waiting, activate it immediately
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version ready — tell it to skip waiting and take over
              newWorker.postMessage({ type: "SKIP_WAITING" })
            }
          })
        })
      })
      .catch(() => {
        // SW registration failed silently — non-critical
      })

    // When the SW sends SW_UPDATED (new version activated), reload the page
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SW_UPDATED") {
        window.location.reload()
      }
    })

    // When the controller changes (new SW took over), reload once
    let refreshing = false
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  }, [])

  return null
}

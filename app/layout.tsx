import type React from "react"
import type { Metadata } from "next"
import { AppProvider } from "@/lib/contexts/AppContext"
import { AuthProvider } from "@/lib/contexts/auth-context"
import { SessionTracker } from "@/components/session-tracker"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  metadataBase: new URL("https://melegy.app"),
  title: "Melegy - Egyptian AI Assistant",
  description: "AI-powered Egyptian dialect chat assistant with image and video generation",
  openGraph: {
    title: "Melegy - Egyptian AI Assistant",
    description: "AI-powered Egyptian dialect chat assistant",
    images: ["/og-image.png"],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" className="dark" suppressHydrationWarning dir="rtl">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Amiri:wght@400;700&family=Tajawal:wght@200;300;400;500;700;800;900&family=Almarai:wght@400;700&family=Changa:wght@400;700&family=El+Messiri:wght@400;700&family=Lalezar&family=Mada:wght@400;700&family=Markazi+Text:wght@400;700&family=Poppins:wght@400;700&family=Montserrat:wght@400;700&family=Playfair+Display:wght@400;700&family=Oswald:wght@400;700&family=Bebas+Neue&family=Inter:wght@400;700&display=swap"
        />
        {/* PWA Core */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />

        {/* Android PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Melegy" />

        {/* iOS PWA — required for Add to Home Screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Melegy" />
        <link rel="apple-touch-icon" href="/images/logo.jpg" />
        <link rel="apple-touch-icon" sizes="120x120" href="/images/logo.jpg" />
        <link rel="apple-touch-icon" sizes="152x152" href="/images/logo.jpg" />
        <link rel="apple-touch-icon" sizes="167x167" href="/images/logo.jpg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/logo.jpg" />
        {/* iOS Splash Screens — media queries required for iOS to recognize them */}
        <meta name="apple-touch-fullscreen" content="yes" />
        {/* iPhone SE / 6/7/8 */}
        <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="/images/logo.jpg" />
        {/* iPhone X/XS/11 Pro */}
        <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" href="/images/logo.jpg" />
        {/* iPhone XR/11 */}
        <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" href="/images/logo.jpg" />
        {/* iPhone 12/13/14 Pro */}
        <link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" href="/images/logo.jpg" />
        {/* iPhone 14 Plus/15 Plus */}
        <link rel="apple-touch-startup-image" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" href="/images/logo.jpg" />
        {/* Fallback for any other iOS device */}
        <link rel="apple-touch-startup-image" href="/images/logo.jpg" />
        {/* Favicon */}
        <link rel="icon" type="image/jpeg" sizes="192x192" href="/images/logo.jpg" />
        <link rel="icon" type="image/jpeg" sizes="512x512" href="/images/logo.jpg" />
        <link rel="shortcut icon" href="/images/logo.jpg" />

        {/* Service Worker Registration */}
        <script src="/register-sw.js" defer></script>
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AuthProvider>
          <AppProvider>
            <SessionTracker />
            {children}
            <Toaster />
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

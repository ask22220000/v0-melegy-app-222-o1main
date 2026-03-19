import type React from "react"
import type { Metadata } from "next"
import { Cairo, Geist_Mono } from "next/font/google"
import { AppProvider } from "@/lib/contexts/AppContext"
import { SessionTracker } from "@/components/session-tracker"
import "./globals.css"

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-cairo",
})
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
 user-id-tracking
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://melegy.app"),

  metadataBase: new URL("https://melegy.app"),
 main
  title: "Melegy - Egyptian AI Assistant",
  description: "مساعد ذكاء اصطناعي متطور يوفر لك إجابات دقيقة، بحث متقدم، وتوليد محتوى إبداعي",
  generator: "v0.app",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/images/logo.jpg", sizes: "192x192", type: "image/jpeg" },
      { url: "/images/logo.jpg", sizes: "512x512", type: "image/jpeg" },
    ],
    apple: [
      { url: "/images/logo.jpg", sizes: "180x180", type: "image/jpeg" },
    ],
    shortcut: "/images/logo.jpg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Melegy",
  },
  openGraph: {
    title: "Melegy - Egyptian AI Assistant",
    description: "مساعد ذكاء اصطناعي متطور يوفر لك إجابات دقيقة، بحث متقدم، وتوليد محتوى إبداعي",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Melegy - Egyptian AI Assistant",
      },
    ],
    locale: "ar_EG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Melegy - Egyptian AI Assistant",
    description: "مساعد ذكاء اصطناعي متطور يوفر لك إجابات دقيقة، بحث متقدم، وتوليد محتوى إبداعي",
    images: ["/icons/icon-512x512.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" className="dark" suppressHydrationWarning>
      <head>
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
      <body className={`${cairo.className} antialiased`} suppressHydrationWarning>
        <AppProvider>
          <SessionTracker />
          {children}
        </AppProvider>
      </body>
    </html>
  )
}

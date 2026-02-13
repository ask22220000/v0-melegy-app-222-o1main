import type React from "react"
import type { Metadata } from "next"
import { Cairo, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AppProvider } from "@/lib/contexts/AppContext"
import { SessionTracker } from "@/components/session-tracker"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
// import { ThemeToggle } from "@/components/theme-toggle"
import "./globals.css"

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-cairo",
})
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Melegy - Egyptian AI Assistant",
  description: "مساعد ذكاء اصطناعي متطور يوفر لك إجابات دقيقة، بحث متقدم، وتوليد محتوى إبداعي",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/images/logo.jpg",
        sizes: "any",
      },
    ],
    apple: "/images/logo.jpg",
    shortcut: "/images/logo.jpg",
  },
  openGraph: {
    title: "Melegy - Egyptian AI Assistant",
    description: "مساعد ذكاء اصطناعي متطور يوفر لك إجابات دقيقة، بحث متقدم، وتوليد محتوى إبداعي",
    images: [
      {
        url: "/images/logo.jpg",
        width: 1200,
        height: 1200,
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
    images: ["/images/logo.jpg"],
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Melegy" />
        <meta name="application-name" content="Melegy" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <link rel="apple-touch-icon" href="/images/logo.jpg" />
        <script src="/register-sw.js" defer></script>
      </head>
      <body className={`${cairo.className} antialiased`}>
        <AppProvider>
          <SessionTracker />
          <PWAInstallPrompt />
          {children}
        </AppProvider>
        <Analytics />
      </body>
    </html>
  )
}

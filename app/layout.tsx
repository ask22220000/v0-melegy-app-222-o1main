import type React from "react"
import type { Metadata } from "next"
import { Tajawal } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { AppProvider } from "@/lib/contexts/AppContext"

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["200", "300", "400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
})

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
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className={`${tajawal.className} antialiased`}>
        <AppProvider>
          {children}
          <Toaster />
        </AppProvider>
      </body>
    </html>
  )
}

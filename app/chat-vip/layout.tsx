import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Melegy VIP - مساعد الأساطير",
  description:
    "تجربة ذكاء اصطناعي VIP بلا حدود — توليد صور وفيديو غير محدود، دردشة متخصصة، ذاكرة محادثة، وأولوية دعم فوري مع ميليجي.",
  keywords: [
    "ميليجي VIP",
    "مساعد ذكاء اصطناعي",
    "توليد صور",
    "توليد فيديو",
    "ذكاء اصطناعي مصري",
    "Melegy VIP",
    "Egyptian AI",
    "AI chat unlimited",
    "باقة الأساطير",
  ],
  robots: { index: false, follow: false },
  openGraph: {
    title: "Melegy VIP - مساعد الأساطير",
    description:
      "تجربة ذكاء اصطناعي VIP بلا حدود — توليد صور وفيديو غير محدود، دردشة متخصصة، وأولوية دعم فوري.",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Melegy VIP",
      },
    ],
    locale: "ar_EG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Melegy VIP - مساعد الأساطير",
    description:
      "تجربة ذكاء اصطناعي VIP بلا حدود — توليد صور وفيديو غير محدود، دردشة متخصصة، وأولوية دعم فوري.",
    images: ["/icons/icon-512x512.png"],
  },
}

export default function ChatVIPLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

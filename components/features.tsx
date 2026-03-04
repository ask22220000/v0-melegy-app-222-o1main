"use client"

import {
  Image,
  Film,
  Paperclip,
  FileText,
  FileSpreadsheet,
  Lightbulb,
  Heart,
  MessageSquare,
} from "lucide-react"
import { useApp } from "@/lib/contexts/AppContext"

const FEATURES = [
  {
    Icon: Image,
    color: "text-blue-400",
    titleAr: "اعمل صورة",
    descAr: "إنشاء صور فنية احترافية بالذكاء الاصطناعي",
    titleEn: "Generate Image",
    descEn: "Create professional artistic images with AI",
  },
  {
    Icon: Image,
    color: "text-pink-400",
    titleAr: "إرفاق و تعديل صورة",
    descAr: "ارفع صورتك وعدّلها بوصف نصي بسيط",
    titleEn: "Attach & Edit Image",
    descEn: "Upload your image and edit it with a simple text description",
  },
  {
    Icon: Film,
    color: "text-purple-400",
    titleAr: "حرك صورة",
    descAr: "حوّل صورتك لفيديو متحرك 10 ثواني لووب",
    titleEn: "Animate Image",
    descEn: "Turn your image into a 10-second looping animated video",
  },
  {
    Icon: Paperclip,
    color: "text-yellow-400",
    titleAr: "إرفاق ملف",
    descAr: "ارفع ملفات وتعامل معها بذكاء",
    titleEn: "Attach File",
    descEn: "Upload files and interact with them intelligently",
  },
  {
    Icon: FileText,
    color: "text-green-400",
    titleAr: "اكتب نص",
    descAr: "كتابة محتوى احترافي ومتنوع حسب طلبك",
    titleEn: "Write Text",
    descEn: "Write professional and varied content on demand",
  },
  {
    Icon: FileSpreadsheet,
    color: "text-emerald-400",
    titleAr: "عاوز شيت Excel",
    descAr: "جداول بيانات منظمة بمنهجية علمية",
    titleEn: "Create Excel Sheet",
    descEn: "Organized spreadsheets with scientific methodology",
  },
  {
    Icon: Lightbulb,
    color: "text-amber-400",
    titleAr: "اقترح فكرة",
    descAr: "أفكار إبداعية ومقترحات ذكية حسب موضوعك",
    titleEn: "Suggest an Idea",
    descEn: "Creative ideas and smart suggestions for your topic",
  },
  {
    Icon: Heart,
    color: "text-red-400",
    titleAr: "ساعدني",
    descAr: "مساعدة شاملة في أي مهمة أو مشكلة",
    titleEn: "Help Me",
    descEn: "Comprehensive assistance with any task or problem",
  },
  {
    Icon: MessageSquare,
    color: "text-cyan-400",
    titleAr: "دردشة",
    descAr: "تواصل ذكي يتكيف مع أسلوبك",
    titleEn: "Chat",
    descEn: "Smart conversation that adapts to your style",
  },
]

export function Features() {
  const { language } = useApp()

  return (
    <section className="container mx-auto px-6 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {FEATURES.map((feature, index) => (
          <div
            key={index}
            className="group relative bg-gradient-to-br from-slate-900/50 to-slate-950/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 hover:scale-[1.03]"
          >
            <div className="mb-4">
              <feature.Icon className={`h-12 w-12 ${feature.color}`} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3" dir={language === "ar" ? "rtl" : "ltr"}>
              {language === "ar" ? feature.titleAr : feature.titleEn}
            </h3>
            <p className="text-white/60 leading-relaxed" dir={language === "ar" ? "rtl" : "ltr"}>
              {language === "ar" ? feature.descAr : feature.descEn}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

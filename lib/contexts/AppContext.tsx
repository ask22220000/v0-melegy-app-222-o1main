"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type Language = "ar" | "en"
type Theme = "dark" | "light"

type AppContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  theme: Theme
  setTheme: (theme: Theme) => void
  translations: typeof translations.ar
}

const translations = {
  ar: {
    // Header
    history: "السجل",
    home: "الرئيسية",
    languageToggle: "EN",
    // Hero
    heroTitle: "Melegy",
    heroSubtitle: "مساعدك الذكي المتطور",
    heroVersion: "(v2.3)",
    heroDescription: "مساعد ذكاء اصطناعي متطور يوفر لك إجابات دقيقة، بحث متقدم، وتوليد محتوى إبداعي",
    startChat: "ابدأ المحادثة 🧠",
    heroCta: "تخيل يكون عندك أشطر موظف في مصر؛ بيكتب، ويرسم، ويحلل، وبيفهمك من كلمة.. ومبيطلبش منك مرتب كبير! .. دلوقتي امتلك ذكاء ميليجي 'فول أوبشن' في باقة VIP.",
    heroCtaSub: "و استمتع بكل مميزات ميليجي بدون حدود.",
    // Pricing link
    pricingLink: "شوف الأسعار والباقات",
    // Features
    features: {
      imageAnalysis: { title: "اعمل صورة", description: "إنشاء صور فنية احترافية بالذكاء الاصطناعي" },
      deepSearch: { title: "إرفاق و تعديل صورة", description: "ارفع صورتك وعدّلها بوصف نصي بسيط" },
      mindMaps: { title: "حرك صورة", description: "حوّل صورتك لفيديو متحرك 10 ثواني لووب" },
      ideaToPrompt: { title: "إرفاق ملف", description: "ارفع ملفات وتعامل معها بذكاء" },
      adaptiveCommunication: { title: "اكتب نص", description: "كتابة محتوى احترافي ومتنوع حسب طلبك" },
      creativeSolving: { title: "عاوز شيت Excel", description: "جداول بيانات منظمة بمنهجية علمية" },
      imageGeneration: { title: "اقترح فكرة", description: "أفكار إبداعية ومقترحات ذكية حسب موضوعك" },
      spreadsheets: { title: "ساعدني", description: "مساعدة شاملة في أي مهمة أو مشكلة" },
      deepThinking: { title: "دردشة", description: "تواصل ذكي يتكيف مع أسلوبك" },
      imageEditing: { title: "تعديل الصور بالذكاء", description: "تعديل الصور بوصف نصي بسيط" },
      imageAnimation: { title: "تحريك الصور", description: "حول صورك لفيديو متحرك سلس" },
      videoGeneration: { title: "توليد الفيديو", description: "إنشاء فيديوهات احترافية بالذكاء الاصطناعي" },
    },
    // Footer
    madeInEgypt: "صنع في مصر 🇪🇬",
    whatsappSupport: "للدعم على WhatsApp",
    whatsappMessage: "مرحباً! كيف يمكننا مساعدتك؟",
    footerPricing: "الأسعار والباقات",
    // Chat page
    chatHistory: "سجل المحادثات",
    deleteAll: "حذف الكل",
    loadChat: "تحميل",
    deleteChat: "حذف",
    noHistory: "لا توجد محادثات سابقة",
    typePlaceholder: "اكتب رسالتك هنا...",
    send: "إرسال",
    copy: "نسخ",
    copied: "تم النسخ!",
    generating: "جاري التوليد...",
    save: "حفظ",
    history2: "السجل",
    listen: "استمع",
    stop: "إيقاف",
    generatingImage: "جاري إنشاء الصورة...",
    analyzingImage: "جاري تحليل الصورة...",
    downloadExcel: "تحميل Excel",
    welcomeMessage: "أهلاً بيك في ميليجي! 👋 أنا مساعدك الذكي. كيف أقدر أساعدك النهاردة؟",
    upgradeTitle: "وصلت للحد المجاني!",
    upgradeDesc: "ترقى لباقة مدفوعة واستمتع بمميزات أكثر ورسائل وصور غير محدودة!",
    upgradeBtn: "ترقى الآن",
    cancelBtn: "إلغاء",
    errorMsg: "عذراً، حصل خطأ. جرب تاني.",
    savedTitle: "تم الحفظ",
    savedDesc: "تم حفظ المحادثة بنجاح",
    emptyConvTitle: "محادثة فارغة",
    emptyConvDesc: "لا توجد محادثة لحفظها",
    copiedTitle: "تم النسخ",
    copiedDesc: "تم نسخ النص بنجاح",
    // Functions menu
    fn_image: "اعمل صورة",
    fn_editImage: "إرفاق و تعديل صورة",
    fn_animateImage: "حرك صورة",
    generatingVideo: "جاري إنشاء الفيديو...",
    fn_attachFile: "إرفاق ملف",
    fn_write: "اكتب نص",
    fn_excel: "عاوز شيت Excel",
    fn_idea: "اقترح فكرة",
    fn_help: "ساعدني",
    fn_chat: "دردشة",
  },
  en: {
    // Header
    history: "History",
    home: "Home",
    languageToggle: "عر",
    // Hero
    heroTitle: "Melegy",
    heroSubtitle: "Your Advanced Smart Assistant",
    heroVersion: "(v2.3)",
    heroDescription:
      "An advanced AI assistant providing accurate answers, advanced search, and creative content generation",
    startChat: "Start Chat 🧠",
    heroCta: "Imagine having the smartest assistant at your fingertips — writing, designing, analyzing, and understanding you instantly.. without a huge salary! Get Melegy's full power with the VIP plan.",
    heroCtaSub: "Enjoy all Melegy features without limits.",
    // Pricing link
    pricingLink: "View Plans & Pricing",
    // Features
    features: {
      imageAnalysis: { title: "Generate Image", description: "Create professional artistic images with AI" },
      deepSearch: { title: "Attach & Edit Image", description: "Upload your image and edit it with a simple text description" },
      mindMaps: { title: "Animate Image", description: "Turn your image into a 10-second looping animated video" },
      ideaToPrompt: { title: "Attach File", description: "Upload files and interact with them intelligently" },
      adaptiveCommunication: { title: "Write Text", description: "Write professional and varied content on demand" },
      creativeSolving: { title: "Create Excel Sheet", description: "Organized spreadsheets with scientific methodology" },
      imageGeneration: { title: "Suggest an Idea", description: "Creative ideas and smart suggestions for your topic" },
      spreadsheets: { title: "Help Me", description: "Comprehensive assistance with any task or problem" },
      deepThinking: { title: "Chat", description: "Smart conversation that adapts to your style" },
      imageEditing: { title: "AI Image Editing", description: "Edit images with simple text descriptions" },
      imageAnimation: { title: "Image Animation", description: "Turn your images into smooth animated videos" },
      videoGeneration: { title: "Video Generation", description: "Create professional AI-generated videos" },
    },
    // Footer
    madeInEgypt: "Made in Egypt 🇪🇬",
    whatsappSupport: "WhatsApp Support",
    whatsappMessage: "Hello! How can we help you?",
    footerPricing: "Plans & Pricing",
    // Chat page
    chatHistory: "Chat History",
    deleteAll: "Delete All",
    loadChat: "Load",
    deleteChat: "Delete",
    noHistory: "No previous conversations",
    typePlaceholder: "Type your message here...",
    send: "Send",
    copy: "Copy",
    copied: "Copied!",
    generating: "Generating...",
    save: "Save",
    history2: "History",
    listen: "Listen",
    stop: "Stop",
    generatingImage: "Generating image...",
    analyzingImage: "Analyzing image...",
    downloadExcel: "Download Excel",
    welcomeMessage: "Welcome to Melegy! 👋 I'm your smart assistant. How can I help you today?",
    upgradeTitle: "Free limit reached!",
    upgradeDesc: "Upgrade to a paid plan and enjoy more features with unlimited messages and images!",
    upgradeBtn: "Upgrade Now",
    cancelBtn: "Cancel",
    errorMsg: "Sorry, an error occurred. Please try again.",
    savedTitle: "Saved",
    savedDesc: "Conversation saved successfully",
    emptyConvTitle: "Empty conversation",
    emptyConvDesc: "No conversation to save",
    copiedTitle: "Copied",
    copiedDesc: "Text copied successfully",
    // Functions menu
    fn_image: "Generate Image",
    fn_editImage: "Attach & Edit Image",
    fn_animateImage: "Animate Image",
    generatingVideo: "Generating video...",
    fn_attachFile: "Attach File",
    fn_write: "Write Text",
    fn_excel: "Create Excel Sheet",
    fn_idea: "Suggest an Idea",
    fn_help: "Help Me",
    fn_chat: "Chat",
  },
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ar")
  const [theme, setThemeState] = useState<Theme>("dark")

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const savedLang = localStorage.getItem("language") as Language
      const savedTheme = localStorage.getItem("theme") as Theme

      if (savedLang) setLanguageState(savedLang)
      if (savedTheme) setThemeState(savedTheme)
    } catch {
      // silently ignore localStorage errors
    }
  }, [])

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute("lang", language)
    document.documentElement.setAttribute("dir", language === "ar" ? "rtl" : "ltr")
  }, [language])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== "undefined") {
      try { localStorage.setItem("language", lang) } catch { /* ignore */ }
    }
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    if (typeof window !== "undefined") {
      try { localStorage.setItem("theme", newTheme) } catch { /* ignore */ }
    }
  }

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        theme,
        setTheme,
        translations: translations[language],
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}

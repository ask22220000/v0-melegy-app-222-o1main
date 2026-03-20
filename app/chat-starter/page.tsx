"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { DesignViewer } from "@/components/design-viewer"
import Link from "next/link"
import { checkSubscriptionAccess } from "@/lib/subscription-check"
import { setActiveSubscription } from "@/lib/set-subscription"
import { UsageIndicator } from "@/components/usage-indicator"
import { useRouter } from "next/navigation"
import { canSendMessage, canGenerateImage, incrementMessageUsage, incrementImageUsage, canAnimateVideoSync, incrementVideoUsage } from "@/lib/usage-tracker"
import {
  Send,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  X,
  Copy,
  Volume2,
  VolumeX,
  Download,
  History,
  Moon,
  Sun,
  Home,
  Plus,
  Image,
  FileText,
  Lightbulb,
  Heart,
  MessageSquare,
  FileSpreadsheet,
  Film,
  Share2,
  Radio,
  } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  imageUrl?: string
  videoUrl?: string
  excelData?: { headers: string[]; rows: any[][] }
  designData?: {
    backgroundImage: string
    textLayer: {
      content: string
      position: string
      style: any
    } | null
  }
}

interface ChatHistory {
  id: string
  title: string
  date: string
  messages: Message[]
}

export default function ChatStarterPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "أهلاً بيك في باقة الطالب! 🎓 معاك 30,000 كلمة و10 صور شهرياً. قوللي محتاج إيه؟",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [monthlyWords, setMonthlyWords] = useState(0)
  const [monthlyImages, setMonthlyImages] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([])
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  
  // Generate unique session ID for analytics tracking (UUID format for database)
  const [sessionId] = useState(() => crypto.randomUUID())
  const [conversationCreated, setConversationCreated] = useState(false)
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showFunctionsMenu, setShowFunctionsMenu] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [subscriptionChecked, setSubscriptionChecked] = useState(false)
  const [mlgUserId, setMlgUserId] = useState<string | null>(null)
  // Animate-image states
  const [showAnimateModal, setShowAnimateModal] = useState(false)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [animateImageUrl, setAnimateImageUrl] = useState<string>("")
  const [animatePrompt, setAnimatePrompt] = useState<string>("")
  const [animateMode, setAnimateMode] = useState<"i2v" | "r2v">("i2v")
  const [animateAudio, setAnimateAudio] = useState<boolean>(false)
  const animateFileRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // قائمة الوظائف المتاحة
  const functionsList = [
    { id: "image", label: "اعمل صورة", icon: Image, prompt: "اعملي صورة " },
    { id: "edit-image", label: "إرفاق و تعديل صورة", icon: Image, action: "attach-edit-image" },
    { id: "animate-image", label: "حرك صورة", icon: Film, action: "animate-image" },
    { id: "attach-file", label: "إرفاق ملف", icon: Paperclip, action: "attach-file" },
    { id: "write", label: "اكتب نص", icon: FileText, prompt: "اكتبلي " },
    { id: "excel", label: "عاوز شيت Excel", icon: FileSpreadsheet, prompt: "اعملي شيت Excel ل " },
    { id: "idea", label: "اقترح فكرة", icon: Lightbulb, prompt: "اقترحلي فكرة عن " },
    { id: "help", label: "ساعدني", icon: Heart, prompt: "ساعدني في " },
    { id: "chat", label: "دردشة", icon: MessageSquare, prompt: "عايز اتكلم معاك عن " },
  ]

  const handleAnimateImage = async () => {
    if (!animateImageUrl || !animatePrompt.trim()) return
    const videoCheck = canAnimateVideoSync()
    if (!videoCheck.allowed) {
      toast({ title: "تجاوزت الحد المسموح", description: videoCheck.reason, variant: "destructive" })
      return
    }
    setShowAnimateModal(false)
    setIsGeneratingVideo(true)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `${animateMode === "r2v" ? "مرجع لفيديو" : "حرك الصورة"}: ${animatePrompt}`,
      imageUrl: animateImageUrl,
    }
    setMessages((prev) => [...prev, userMessage])
    try {
      const res = await fetch("/api/animate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: animateImageUrl, prompt: animatePrompt, mode: animateMode, generateAudio: animateAudio }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "فشل التوليد")
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "تم إنشاء الفيديو بنجاح!",
        videoUrl: data.videoUrl,
      }
      setMessages((prev) => [...prev, assistantMessage])
      await incrementVideoUsage()
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "فشل توليد الفيديو", variant: "destructive" })
    } finally {
      setIsGeneratingVideo(false)
      setAnimateImageUrl("")
      setAnimatePrompt("")
      setAnimateMode("i2v")
    }
  }

  const handleFunctionSelect = (func: any) => {
    if (func.action === "attach-edit-image") {
      fileInputRef.current?.click()
      setInput("عدل الصورة و ")
      setShowFunctionsMenu(false)
    } else if (func.action === "animate-image") {
      setShowAnimateModal(true)
      setShowFunctionsMenu(false)
    } else if (func.action === "attach-file") {
      fileInputRef.current?.click()
      setShowFunctionsMenu(false)
    } else if (func.prompt) {
      setInput(func.prompt)
      setShowFunctionsMenu(false)
    }
  }
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()

  const MAX_WORDS = 30000
  const MAX_IMAGES = 10

  // Initialize user from Supabase Auth
  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().auth.getUser().then(({ data }) => {
        if (data.user) {
          setMlgUserId(data.user.id)
        } else {
          window.location.href = "/auth/login"
        }
      })
    })
  }, [])

  // Set plan and check subscription access on mount
  useEffect(() => {
    setActiveSubscription('startup')
    const checkAccess = async () => {
      const accessResult = await checkSubscriptionAccess('startup')
      if (!accessResult.hasAccess) {
        toast({
          title: "انتهت صلاحية الاشتراك",
          description: accessResult.message,
          variant: "destructive",
        })
        setTimeout(() => {
          window.location.href = '/chat'
        }, 2000)
      } else {
        setSubscriptionChecked(true)
      }
    }
    checkAccess()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const init = async () => {
      // Load theme + monthly counters from backend
      try {
        const res = await fetch("/api/usage", { cache: "no-store" })
        if (res.ok) {
          const { usage } = await res.json()
          const theme = (usage?.theme as "light" | "dark") || "dark"
          setTheme(theme)
          if (theme === "dark") {
            document.documentElement.classList.add("dark")
            document.body.className = "bg-[#0a0b1a] text-white"
          } else {
            document.documentElement.classList.remove("dark")
            document.body.className = "bg-white text-black"
          }
          setMonthlyWords(usage?.monthly_words ?? 0)
          setMonthlyImages(usage?.monthly_images ?? 0)
        }
      } catch {
        // fallback defaults
        document.documentElement.classList.add("dark")
      }

      // Load chat histories from Supabase Auth user
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const { data: authData } = await createClient().auth.getUser()
        if (authData.user) {
          const res = await fetch(`/api/save-chat?user_id=${encodeURIComponent(authData.user.id)}`)
          if (res.ok) {
            const data = await res.json()
            if (data.histories?.length > 0) setChatHistories(data.histories)
          }
        }
      } catch (error) {
        console.error("Error loading chat histories:", error)
      }
    }
    init()
  }, [])

  const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length

  const detectImageRequest = (text: string): boolean => {
    const imageKeywords = [
      "اعمللي صورة",
      "اعملي صورة",
      "اعمل صورة",
      "عاوز صورة",
      "عاوزك تعمللي صورة",
      "عاوزك تولد صورة",
      "ولد صورة",
      "توليد صورة",
      "صمملي صورة",
      "ارسملي صورة",
    ]
    return imageKeywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()))
  }

  const detectExcelRequest = (text: string): boolean => {
    const excelKeywords = ["شيت", "excel", "اكسيل", "جدول", "spreadsheet", "اعمل شيت", "بيانات"]
    return excelKeywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()))
  }

  const detectImageEditRequest = (text: string, hasAttachedImage: boolean): boolean => {
    if (!hasAttachedImage) return false

    const editKeywords = [
      "عدل",
      "غير",
      "خلي",
      "اعمل",
      "حط",
      "ضيف",
      "شيل",
      "احذف",
      "لون",
      "لابس",
      "واقف",
      "جنب",
      "هشيل",
      "خليها",
      "اسيب",
      "edit",
      "change",
      "modify",
    ]

    return editKeywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()))
  }

  const toggleListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast({
        title: "غير مدعوم",
        description: "المتصفح ده مش بيدعم التع��ف على الصوت",
        variant: "destructive",
      })
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = "ar-EG"
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => prev + " " + transcript)
      setIsListening(false)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "نوع ملف غير مدعوم",
        description: "من فضلك ارفع صورة فقط",
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setAttachedImage({
        url: event.target?.result as string,
        name: file.name,
      })
    }
    reader.readAsDataURL(file)
  }

  const generateImageWithPrompt = async (userPrompt: string) => {
    if (monthlyImages >= MAX_IMAGES) {
      toast({
        title: "انتهت الصور الشهرية",
        description: "ترقى لباقة المحترف للحصول على 50 صورة شهرياً!",
        variant: "destructive",
      })
      return
    }

    try {
      setIsGeneratingImage(true)
      setCountdown(10)

      const countdownInterval = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)

      try {
        const textMatch = userPrompt.match(/"([^"]+)"|'([^']+)'|(?:اكتب|write|كتابة)\s+(.+?)(?:\s+على|\s+فوق|$)/i)
        const extractedText = textMatch ? (textMatch[1] || textMatch[2] || textMatch[3]) : null

        const cleanImagePrompt = userPrompt
          .replace(/"[^"]+"|'[^']+'/, "")
          .replace(/(?:اكتب|write|كتابة)\s+.+?(?:\s+على|\s+فوق|$)/gi, "")
          .trim()

        const response = await fetch("/api/generate-design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imagePrompt: cleanImagePrompt || userPrompt,
            textContent: extractedText,
            textPosition: "center",
          }),
        })

        if (!response.ok) throw new Error("Failed to generate design")

        const { design } = await response.json()

        clearInterval(countdownInterval)
        setIsGeneratingImage(false)
        setCountdown(10)

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "تم إنشاء التصميم بنجاح! يمكنك تعديل النص والألوان.",
          imageUrl: design.backgroundImage,
          designData: design,
        }

      setMessages((prev) => [...prev, assistantMessage])

      const newImageCount = monthlyImages + 1
      setMonthlyImages(newImageCount)
      fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthly_images: newImageCount }) })
    } catch (error) {
      clearInterval(countdownInterval)
      setIsGeneratingImage(false)
      setCountdown(10)
      toast({
        title: "خطأ",
        description: `فشل في إنشاء الصورة: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    }
    } catch (error) {
      console.error("[v0] Error generating image with prompt:", error)
    }
  }

  // Helper function to track analytics
  const trackAnalytics = async (action: string, data?: any) => {
    try {
      await fetch("/api/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      })
    } catch {
      // Silent fail
    }
  }

  // Create conversation in database on first message
  const ensureConversationExists = async () => {
    if (conversationCreated) return
    try {
      await fetch("/api/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trackConversation",
          data: { conversationId: sessionId, userId: "anonymous" },
        }),
      })
      setConversationCreated(true)
    } catch {
      // Silent fail
    }
  }

  const analyzeImage = async (imageUrl: string, userMessage?: string): Promise<string> => {
    try {
      setIsAnalyzingImage(true)
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, userMessage }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze image")
      }

      const { description } = await response.json()
      setIsAnalyzingImage(false)
      return description
    } catch (error) {
      console.error("[v0] Image analysis error:", error)
      setIsAnalyzingImage(false)
      return "مش قادر أحلل الصورة دي"
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && !attachedImage) || isLoading) return

    const messageToSend = input.trim()
    setInput("")
    setIsLoading(true)

    if (attachedImage && detectImageEditRequest(messageToSend, true)) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: messageToSend,
        imageUrl: attachedImage.url,
      }

      setMessages((prev) => [...prev, userMessage])

      const tempAttachedImage = attachedImage
      setAttachedImage(null)

      // تعديل الصورة مع دعم Text Layers
      try {
        const textMatch = messageToSend.match(/"([^"]+)"|'([^']+)'|(?:اكتب|write|كتابة)\s+(.+?)(?:\s+على|\s+فوق|$)/i)
        const extractedText = textMatch ? (textMatch[1] || textMatch[2] || textMatch[3]) : null

        const cleanEditPrompt = messageToSend
          .replace(/"[^"]+"|'[^']+'/, "")
          .replace(/(?:اكتب|write|كتابة)\s+.+?(?:\s+على|\s+فوق|$)/gi, "")
          .trim()

        const editResponse = await fetch("/api/edit-image-fal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: tempAttachedImage?.url,
            prompt: cleanEditPrompt || messageToSend,
          }),
        })

        if (!editResponse.ok) {
          const errData = await editResponse.json().catch(() => ({}))
          throw new Error(errData.error || "فشل تعديل الصورة")
        }

        const { editedImageUrl } = await editResponse.json()

        if (extractedText) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "تم تعديل الصورة وإضافة النص!",
            imageUrl: editedImageUrl,
            designData: {
              backgroundImage: editedImageUrl,
              textLayer: {
                content: extractedText,
                position: "center",
                style: {},
              },
            },
          }
          setMessages((prev) => [...prev, assistantMessage])
        } else {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "تم تعديل الصورة بنجاح!",
            imageUrl: editedImageUrl,
          }
          setMessages((prev) => [...prev, assistantMessage])
        }
      } catch (error) {
        toast({
          title: "خطأ في تعديل الصورة",
          description: "حاول مرة تانية",
          variant: "destructive",
        })
      }

      setIsLoading(false)
      return
    }

    const wordCount = countWords(messageToSend)
    if (monthlyWords + wordCount > MAX_WORDS) {
      toast({
        title: "انتهت الكلمات الشهرية",
        description: "ترقى لباقة المحترف للحصول على 120,000 كلمة شهرياً!",
        variant: "destructive",
      })
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageToSend,
      imageUrl: attachedImage?.url,
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = messageToSend
    const currentAttachedImage = attachedImage
    setAttachedImage(null)
    setIsLoading(true)

    try {
      const isImageRequest = detectImageRequest(currentInput)
      const isExcelRequest = detectExcelRequest(currentInput)

      if (currentAttachedImage) {
        const imageDescription = await analyzeImage(currentAttachedImage.url, currentInput)

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: imageDescription,
        }

        setMessages((prev) => [...prev, assistantMessage])
        setIsLoading(false)

        const newWordCount = monthlyWords + wordCount + countWords(imageDescription)
        setMonthlyWords(newWordCount)
        fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthly_words: newWordCount }) })
        return
      }

      if (isImageRequest) {
        await generateImageWithPrompt(currentInput)
        setIsLoading(false)
        return
      }

      if (isExcelRequest) {
        const excelResponse = await fetch("/api/generate-excel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: currentInput }),
        })

        if (!excelResponse.ok) throw new Error("Failed to generate Excel")

        const excelResult = await excelResponse.json()

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: excelResult.message || "تم إنشاء الشيت بنجاح!",
          excelData: excelResult.excelData,
        }

        setMessages((prev) => [...prev, assistantMessage])
        setIsLoading(false)
        return
      }

      const conversationHistory = messages.slice(-6).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      const response = await fetch("/api/perplexity-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentInput,
          conversationHistory,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || "API error")
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
      }

      setMessages((prev) => [...prev, assistantMessage])

      const newWordCount = monthlyWords + wordCount + countWords(data.response || "")
      setMonthlyWords(newWordCount)
      fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthly_words: newWordCount }) })
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "عذراً، حصل خطأ. جرب تاني.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const speakText = async (text: string, messageId: string) => {
    if (playingAudio === messageId) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }
      setPlayingAudio(null)
      return
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }

    setPlayingAudio(messageId)

    try {
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      const contentType = response.headers.get("content-type")

      if (contentType?.includes("audio")) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        currentAudioRef.current = audio

        audio.onended = () => {
          setPlayingAudio(null)
          URL.revokeObjectURL(audioUrl)
          currentAudioRef.current = null
        }

        audio.onerror = () => {
          setPlayingAudio(null)
          URL.revokeObjectURL(audioUrl)
          currentAudioRef.current = null
          fallbackToWebSpeech(text, messageId)
        }

        await audio.play()
      } else {
        fallbackToWebSpeech(text, messageId)
      }
    } catch (error) {
      console.error("[v0] TTS error:", error)
      fallbackToWebSpeech(text, messageId)
    }
  }

  // حفظ المحادثة الحالية في Supabase
  const saveCurrentConversation = async () => {
    if (messages.length <= 1) {
      toast({
        title: "محادثة فارغة",
        description: "لا توجد محادثة لحفظها",
        variant: "destructive",
      })
      return
    }

    const title = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content.substring(0, 30))
      .join(" | ") || "محادثة بدون عنوان"

    try {
      const response = await fetch("/api/save-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: mlgUserId,
          chat_title: title.substring(0, 50),
          chat_date: new Date().toLocaleDateString("ar-EG"),
          messages: messages,
        }),
      })

      if (!response.ok) {
        throw new Error("فشل في حفظ المحادثة")
      }

      const newChat: ChatHistory = {
        id: Date.now().toString(),
        title: title.substring(0, 50),
        date: new Date().toLocaleDateString("ar-EG"),
        messages: messages,
      }

      setChatHistories((prev) => [...prev, newChat])

      toast({
        title: "تم الحفظ",
        description: "تم حفظ المحادثة في حسابك بنجاح",
      })

      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "أهلاً بيك في باقة الطالب! 🎓 معاك 30,000 كلمة و10 صور شهرياً. قوللي محتاج إيه؟",
        },
      ])
    } catch (error) {
      toast({
        title: "فشل الحفظ",
        description: "حدث خطأ أثناء حفظ المحادثة",
        variant: "destructive",
      })
    }
  }

  const fallbackToWebSpeech = (text: string, messageId: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "ar-SA"
      utterance.rate = 1.0

      const voices = window.speechSynthesis.getVoices()
      const arabicVoice = voices.find((voice) => voice.lang.startsWith("ar"))
      if (arabicVoice) utterance.voice = arabicVoice

      utterance.onend = () => setPlayingAudio(null)
      utterance.onerror = () => setPlayingAudio(null)

      window.speechSynthesis.speak(utterance)
    } else {
      setPlayingAudio(null)
    }
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "تم النسخ", description: "تم نسخ النص بنجاح" })
  }

  const downloadImage = (imageUrl: string) => {
    const filename = `melegy-image-${Date.now()}.png`
    const a = document.createElement("a")
    a.href = `/api/download-image?url=${encodeURIComponent(imageUrl)}&filename=${filename}`
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const downloadExcel = (excelData: { headers: string[]; rows: any[][] }) => {
    const BOM = "\uFEFF"
    const csvContent = [
      excelData.headers.map((h) => `"${h}"`).join(","),
      ...excelData.rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `data-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const loadChatHistory = (chat: ChatHistory) => {
    setMessages(chat.messages)
    setShowChatHistory(false)
  }

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
      fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: newTheme }) })

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
      document.body.className = "bg-[#0a0b1a] text-white"
    } else {
      document.documentElement.classList.remove("dark")
      document.body.className = "bg-white text-black"
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl" style={{ backgroundColor: 'hsl(var(--background))' }}>
      {/* Header buttons - Right side: Theme + Home, Left side: History */}
      <div className="fixed top-0 left-0 right-0 z-[100] bg-background border-b border-border py-2 md:py-4" style={{ backgroundColor: 'hsl(var(--background))' }}>
        <div className="flex items-center justify-between px-2 sm:px-4 md:px-6">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <button
              onClick={saveCurrentConversation}
              className="bg-card border-2 border-border text-foreground px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-lg transition-all duration-300 hover:bg-accent hover:border-accent-foreground/50 hover:shadow-lg hover:scale-105 flex items-center gap-1 sm:gap-1.5 cursor-pointer font-medium text-xs sm:text-sm"
              aria-label="حفظ المحادثة"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">حفظ</span>
            </button>
            <button
              onClick={() => setShowChatHistory(!showChatHistory)}
              className="bg-card border-2 border-border text-foreground px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-lg transition-all duration-300 hover:bg-accent hover:border-accent-foreground/50 hover:shadow-lg hover:scale-105 flex items-center gap-1 sm:gap-1.5 cursor-pointer font-medium text-xs sm:text-sm"
              aria-label="سجل المحادثات"
            >
              <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">السجل</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <Link
              href="/"
              className="bg-card border-2 border-border text-foreground px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-lg transition-all duration-300 hover:bg-accent hover:border-accent-foreground/50 hover:shadow-lg hover:scale-105 flex items-center gap-1 sm:gap-1.5 cursor-pointer font-medium text-xs sm:text-sm"
              aria-label="الصفحة الرئيسية"
            >
              <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">الرئيسية</span>
            </Link>
            <button
              onClick={toggleTheme}
              className="bg-card border-2 border-border text-foreground px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg transition-all duration-300 hover:bg-accent hover:border-accent-foreground/50 hover:shadow-lg hover:scale-105 flex items-center cursor-pointer"
              aria-label="تغيير المظهر"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </button>
          </div>
        </div>
      </div>

      {showChatHistory && (
        <div className="absolute top-16 left-4 z-50 w-72 max-h-96 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <span className="font-bold">سجل المحادثات</span>
            <Button variant="ghost" size="sm" onClick={() => setShowChatHistory(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {chatHistories.length === 0 ? (
            <p className="p-4 text-gray-500 text-center">لا توجد محادثات سابقة</p>
          ) : (
            chatHistories.map((chat) => (
              <div
                key={chat.id}
                onClick={() => loadChatHistory(chat)}
                className="p-3 border-b border-gray-800 hover:bg-gray-800 cursor-pointer"
              >
                <p className="text-sm truncate">{chat.title}</p>
                <p className="text-xs text-gray-500">{chat.date}</p>
              </div>
            ))
          )}
        </div>
      )}

      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage || "/placeholder.svg"}
            alt="zoomed"
            className="max-w-[90%] max-h-[90%] object-contain"
          />
          <Button className="absolute top-4 right-4" variant="ghost" onClick={() => setZoomedImage(null)}>
            <X className="h-6 w-6" />
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-24 pb-32">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <Card
              className={`w-full sm:w-auto max-w-[95%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[75%] p-2 sm:p-3 md:p-4 ${message.role === "user" ? "bg-blue-600/20 border-blue-500/30" : "bg-gray-800/50 border-gray-700"}`}
            >
              {message.designData ? (
                <div className="mb-3">
                  <DesignViewer
                    backgroundImage={message.designData.backgroundImage}
                    textLayer={message.designData.textLayer}
                  />
                </div>
              ) : message.imageUrl ? (
                <div className="relative group mb-2">
                  <img
                    src={message.imageUrl || "/placeholder.svg"}
                    alt="image"
                    className="max-w-full h-auto rounded-lg cursor-pointer"
                    onClick={() => setZoomedImage(message.imageUrl!)}
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" onClick={() => downloadImage(message.imageUrl!)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
              {message.videoUrl && (
                <div className="mb-3">
                  <video src={message.videoUrl} controls loop className="max-w-full rounded-lg" />
                  <div className="flex gap-2 mt-2">
                    <a
                      href={`/api/download-image?url=${encodeURIComponent(message.videoUrl)}&filename=melegy-video-${Date.now()}.mp4`}
                      download
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 rounded-lg text-xs font-bold transition-colors"
                      style={{ fontFamily: "Cairo, sans-serif" }}
                    >
                      <Download className="h-3.5 w-3.5" /> تحميل
                    </a>
                    <button
                      onClick={async () => {
                        if (navigator.share) {
                          await navigator.share({ url: message.videoUrl! })
                        } else {
                          navigator.clipboard.writeText(message.videoUrl!)
                          toast({ title: "تم النسخ", description: "تم نسخ رابط الفيديو" })
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg text-xs font-bold transition-colors"
                      style={{ fontFamily: "Cairo, sans-serif" }}
                    >
                      <Share2 className="h-3.5 w-3.5" /> مشاركة
                    </button>
                  </div>
                </div>
              )}
              <p className="chat-message whitespace-pre-wrap break-words leading-relaxed text-xs font-bold" style={{ fontFamily: "Cairo, sans-serif", fontSize: "12px", fontWeight: "bold" }}>{message.content}</p>
              {message.excelData && (
                <div className="mt-2">
                  <div className="overflow-x-auto max-h-48 border border-gray-700 rounded">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-800">
                        <tr>
                          {message.excelData.headers.map((h, i) => (
                            <th key={i} className="px-2 py-1 text-right">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {message.excelData.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-gray-700">
                            {row.map((cell, j) => (
                              <td key={j} className="px-2 py-1">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button size="sm" className="mt-2" onClick={() => downloadExcel(message.excelData!)}>
                    <Download className="h-4 w-4 mr-1" /> تحميل Excel
                  </Button>
                </div>
              )}
              {message.role === "assistant" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => speakText(message.content, message.id)}
                    className="flex items-center gap-1 text-gray-400 hover:text-white"
                  >
                    {playingAudio === message.id ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    {playingAudio === message.id ? "إيقاف" : "استمع"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyText(message.content)}
                    className="flex items-center gap-1 text-gray-400 hover:text-white"
                  >
                    <Copy className="h-4 w-4" /> نسخ
                  </Button>
                </div>
              )}
            </Card>
          </div>
        ))}

        {isGeneratingImage && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-6 bg-gray-800 border-gray-700">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full" />
                  <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-500">{countdown}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-400">جاري إنشاء الصورة...</p>
              </div>
            </Card>
          </div>
        )}

        {isAnalyzingImage && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-6 bg-gray-800 border-gray-700">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-400">جاري تحليل الصورة...</p>
              </div>
            </Card>
          </div>
        )}

        {isGeneratingVideo && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-6 bg-gray-800 border-gray-700">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full" />
                  <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" />
                  <Film className="absolute inset-0 m-auto h-6 w-6 text-purple-400" />
                </div>
                <p className="text-sm text-gray-400" style={{ fontFamily: "Cairo, sans-serif" }}>جاري إنشاء الفيديو...</p>
              </div>
            </Card>
          </div>
        )}

        {isLoading && !isGeneratingImage && !isAnalyzingImage && (
          <div className="flex justify-start">
            <Card className="p-4 bg-gray-800/50 border-gray-700">
              <Loader2 className="h-5 w-5 animate-spin" />
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {attachedImage && (
        <div className="px-4 py-2 border-t border-border bg-card">
          <div className="relative inline-block">
            <img src={attachedImage.url || "/placeholder.svg"} alt="preview" className="h-20 rounded-lg" />
            <button
              onClick={() => setAttachedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

          <form onSubmit={handleSubmit} className="fixed bottom-0 left-0 right-0 p-4 border-t border-border bg-background z-40" style={{ backgroundColor: 'hsl(var(--background))' }}>
        <div className="flex gap-2 items-center relative">
          <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 shrink-0">
            <Send className="h-5 w-5" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
              if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                e.preventDefault()
                handleSubmit(e as any)
              }
            }}
            placeholder="اكتب رسالتك هنا..."
            className="flex-1 bg-card border-border text-right text-xs font-bold resize-none min-h-[44px] max-h-[200px] overflow-y-auto pr-3"
            style={{ fontFamily: "Cairo, sans-serif", fontSize: "12px", fontWeight: "bold" }}
            dir="rtl"
            rows={1}
          />
          <div className="relative shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowFunctionsMenu(!showFunctionsMenu)}
              className="text-gray-400 hover:text-white border border-gray-600 rounded-lg"
            >
              <Plus className="h-5 w-5" />
            </Button>
                {showFunctionsMenu && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-auto min-w-[160px] bg-background border border-border rounded-xl shadow-xl z-[90] overflow-hidden max-h-[300px] overflow-y-auto" style={{ backgroundColor: 'hsl(var(--background))' }}>
                <div className="p-1 sm:p-2">
                  {functionsList.map((func) => (
                    <button
                      key={func.id}
                      type="button"
                      onClick={() => handleFunctionSelect(func)}
                      className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-accent rounded-lg transition-colors text-right"
                    >
                      <func.icon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 shrink-0" />
                      <span className="text-xs sm:text-sm font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>{func.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
  <Button
  type="button"
  variant="ghost"
  onClick={toggleListening}
  className={`shrink-0 ${isListening ? "text-red-500" : "text-gray-400"}`}
  >
  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
  </Button>
  <Button
    type="button"
    variant="ghost"
    onClick={() => router.push("/voice-chat")}
    className="shrink-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
    title="دردشة صوتية مباشرة"
  >
    <Radio className="h-5 w-5" />
  </Button>
  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
  </div>
  </form>

      {showAnimateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowAnimateModal(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Film className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>حرك صور��</h2>
              </div>
              <button onClick={() => setShowAnimateModal(false)} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>الصورة</p>
              {animateImageUrl ? (
                <div className="relative inline-block">
                  <img src={animateImageUrl} alt="preview" className="h-24 rounded-lg border border-gray-700" />
                  <button onClick={() => setAnimateImageUrl("")} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button onClick={() => animateFileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm transition-colors" style={{ fontFamily: "Cairo, sans-serif" }}>
                    <Image className="h-4 w-4" /> ارفع صورة
                  </button>
                  {messages.filter((m) => m.imageUrl).length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>أو اختر من الشات</p>
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                        {messages.filter((m) => m.imageUrl).slice(-6).map((m) => (
                          <img key={m.id} src={m.imageUrl} alt="chat img" className="h-16 w-16 object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-purple-500 transition-all" onClick={() => setAnimateImageUrl(m.imageUrl!)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <input ref={animateFileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => setAnimateImageUrl(ev.target?.result as string); reader.readAsDataURL(file) }} />
            </div>
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>نوع الفيديو</p>
              <div className="flex gap-2">
                <button onClick={() => setAnimateMode("i2v")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors border ${animateMode === "i2v" ? "bg-purple-600/30 border-purple-500 text-purple-300" : "bg-gray-800 border-gray-600 text-gray-400"}`} style={{ fontFamily: "Cairo, sans-serif" }}>تحريك الصورة</button>
                <button onClick={() => setAnimateMode("r2v")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors border ${animateMode === "r2v" ? "bg-purple-600/30 border-purple-500 text-purple-300" : "bg-gray-800 border-gray-600 text-gray-400"}`} style={{ fontFamily: "Cairo, sans-serif" }}>مشهد جديد (مرجع)</button>
              </div>
              <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: "Cairo, sans-serif" }}>{animateMode === "i2v" ? "الصورة هتتحرك بشكل سلس (10 ثانية)" : "الشخصية هتظهر في مشهد جديد حسب البرومبت (10 ثانية)"}</p>
            </div>
            <div className="mb-5">
              <p className="text-xs text-gray-400 mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>البرومبت (عربي أو إنجليزي)</p>
              <textarea value={animatePrompt} onChange={(e) => setAnimatePrompt(e.target.value)} placeholder={animateMode === "i2v" ? "مثال: الشعر يتحرك مع الريح..." : "مثال: الشخصية بتمشي في الشارع..."} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm resize-none min-h-[80px] focus:outline-none focus:border-purple-500" style={{ fontFamily: "Cairo, sans-serif" }} dir="rtl" />
            </div>
            <button onClick={handleAnimateImage} disabled={!animateImageUrl || !animatePrompt.trim()} className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2" style={{ fontFamily: "Cairo, sans-serif" }}>
              <Film className="h-4 w-4" /> ولد الفيديو
            </button>
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2744] rounded-2xl p-6 max-w-md w-full border border-green-500/30 shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">استنفدت حد التعديلات الشهري!</h3>
              <p className="text-gray-300 mb-6">
                لقد استخدمت 5 تعديلات هذا الشهر في باقة Starter. ننصحك بالترقية لباقة أعلى للحصول على المزيد من
                التعديلات.
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="/pricing"
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all"
                >
                  ترقية الباقة
                </a>
                <a
                  href="https://www.paypal.com/ncp/payment/62LSQQMKNHJPE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all"
                >
                  شراء Tokens إضافية
                </a>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-all"
                >
                  لاحقاً
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Toaster />
    </div>
  )
}

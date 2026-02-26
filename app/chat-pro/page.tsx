"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { DesignViewer } from "@/components/design-viewer"
import { UsageIndicator } from "@/components/usage-indicator"
import Link from "next/link"
import { checkSubscriptionAccess } from "@/lib/subscription-check"
import { setActiveSubscription } from "@/lib/set-subscription"
import { canSendMessage, canGenerateImage, incrementMessageUsage, incrementImageUsage } from "@/lib/usage-tracker"
import {
  Send,
  Loader2,
  Copy,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Paperclip,
  X,
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

export default function ChatProPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "أهلاً بيك في باقة المحترف! 🚀 معاك 120,000 كلمة و50 صورة احترافية شهرياً مع أولوية المعالجة. إزاي أقدر أساعدك؟",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [monthlyWords, setMonthlyWords] = useState(0)
  const [monthlyImages, setMonthlyImages] = useState(0)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([])
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()

  const MAX_WORDS = 120000
  const MAX_IMAGES = 50

  // Generate unique session ID for analytics tracking (UUID format for database)
  const [sessionId] = useState(() => crypto.randomUUID())
  const [conversationCreated, setConversationCreated] = useState(false)

  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showFunctionsMenu, setShowFunctionsMenu] = useState(false)
  const [subscriptionChecked, setSubscriptionChecked] = useState(false)

  // قائمة الوظائف المتاحة
  const functionsList = [
    { id: "image", label: "اعمل صورة", icon: Image, prompt: "اعملي صورة " },
    { id: "edit-image", label: "إرفاق و تعديل صورة", icon: Image, action: "attach-edit-image" },
    { id: "attach-file", label: "إرفاق ملف", icon: Paperclip, action: "attach-file" },
    { id: "write", label: "اكتب نص", icon: FileText, prompt: "اكتبلي " },
    { id: "excel", label: "عاوز شيت Excel", icon: FileSpreadsheet, prompt: "اعملي شيت Excel ل " },
    { id: "idea", label: "اقترح فكرة", icon: Lightbulb, prompt: "اقترحلي فكرة عن " },
    { id: "help", label: "ساعدني", icon: Heart, prompt: "ساعدني في " },
    { id: "chat", label: "دردشة", icon: MessageSquare, prompt: "عايز اتكلم معاك عن " },
  ]

  const handleFunctionSelect = (func: any) => {
    if (func.action === "attach-edit-image") {
      fileInputRef.current?.click()
      setInput("عدل الصورة و ")
      setShowFunctionsMenu(false)
    } else if (func.action === "attach-file") {
      fileInputRef.current?.click()
      setShowFunctionsMenu(false)
    } else if (func.prompt) {
      setInput(func.prompt)
      setShowFunctionsMenu(false)
    }
  }

  // Set plan and check subscription access on mount
  useEffect(() => {
    // Set active subscription to pro plan
    setActiveSubscription('pro')
    
    const checkAccess = async () => {
      const accessResult = await checkSubscriptionAccess('pro')
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
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null
    const initialTheme = savedTheme || "dark"
    setTheme(initialTheme)

    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark")
      document.body.className = "bg-[#0a0b1a] text-white"
    } else {
      document.documentElement.classList.remove("dark")
      document.body.className = "bg-white text-black"
    }

    const savedWords = localStorage.getItem("pro_monthly_words")
    const savedImages = localStorage.getItem("pro_monthly_images")
    const savedMonth = localStorage.getItem("pro_month")
    const currentMonth = new Date().getMonth().toString()

    if (savedMonth !== currentMonth) {
      localStorage.setItem("pro_month", currentMonth)
      localStorage.setItem("pro_monthly_words", "0")
      localStorage.setItem("pro_monthly_images", "0")
      setMonthlyWords(0)
      setMonthlyImages(0)
    } else {
      setMonthlyWords(Number.parseInt(savedWords || "0"))
      setMonthlyImages(Number.parseInt(savedImages || "0"))
    }

    // Load chat histories
    try {
      const savedHistories = localStorage.getItem("melegy_chat_histories_pro")
      if (savedHistories) {
        setChatHistories(JSON.parse(savedHistories))
      }
    } catch (error) {
      console.error("Error loading chat histories:", error)
    }
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

  const detectVideoRequest = (text: string): boolean => {
    const videoKeywords = ["فيديو", "video", "عاوز فيديو", "اعمل فيديو", "ولد فيديو"]
    return videoKeywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()))
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

    return editKeywords.some((keyword) => text.toLowerCase().includes(keyword))
  }

  const toggleListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast({
        title: "غير مدعوم",
        description: "المتصفح ده مش بيدعم التعرف على الصوت",
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
    // Check image generation limits
    const imageCheck = canGenerateImage()
    if (!imageCheck.allowed) {
      toast({
        title: "وصلت للحد الأقصى",
        description: imageCheck.reason,
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
        // Extract text content from prompt
        const textMatch = userPrompt.match(/"([^"]+)"|'([^']+)'|(?:اكتب|write|كتابة)\s+(.+?)(?:\s+على|\s+فوق|$)/i)
        const extractedText = textMatch ? (textMatch[1] || textMatch[2] || textMatch[3]) : null

        const cleanImagePrompt = userPrompt
          .replace(/"[^"]+"|'[^']+'/, "")
          .replace(/(?:اكتب|write|كتابة)\s+.+?(?:\s+على|\s+فوق|$)/gi, "")
          .trim()

        // Generate design
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
          content: "تم إنشاء التصميم بنجاح! يمكنك تعديل النص والألوان والموضع.",
          imageUrl: design.backgroundImage,
          designData: design,
        }

        setMessages((prev) => [...prev, assistantMessage])

        const newImageCount = monthlyImages + 1
        setMonthlyImages(newImageCount)
        localStorage.setItem("pro_monthly_images", newImageCount.toString())
        
        // Increment image usage
        incrementImageUsage()
        
        // Track image generation
        trackAnalytics("trackFeature", {
          feature: "image_generation",
          userId: Date.now().toString(),
        })
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
      console.error("[v0] Error generating image:", error)
    }
  }

  // Helper function to track analytics
  const trackAnalytics = async (action: string, data?: any) => {
    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      })
    } catch (error) {
      // Silent fail - analytics are non-critical
    }
  }

  // Create conversation in database on first message
  const ensureConversationExists = async () => {
    if (conversationCreated) return
    
    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trackConversation",
          data: {
            conversationId: sessionId,
            userId: "anonymous",
          },
        }),
      })
      setConversationCreated(true)
    } catch (error) {
      // Silent fail - conversation tracking is non-critical
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
    if (!input.trim() || isLoading) return

    // Check usage limits
    const messageCheck = canSendMessage()
    if (!messageCheck.allowed) {
      toast({
        title: "وصلت للحد الأقصى",
        description: messageCheck.reason,
        variant: "destructive",
      })
      return
    }

    const messageToSend = input.trim()
    setInput("")
    setIsLoading(true)
    
    // Increment message usage
    incrementMessageUsage()

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

        if (!editResponse.ok) throw new Error("فشل تعديل الصورة")

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
        description: "ترقى لباقة الأساطير للحصول على استخدام بلا حدود!",
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
      const isVideoRequest = detectVideoRequest(currentInput)
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
        localStorage.setItem("pro_monthly_words", newWordCount.toString())
        return
      }

      if (isImageRequest) {
        await generateImageWithPrompt(currentInput)
        setIsLoading(false)
        return
      }

      if (isVideoRequest) {
        toast({
          title: "خاصية محذوفة",
          description: "تم إزالة خاصية توليد الفيديو. استخدم توليد الصور بدلاً منها.",
          variant: "destructive",
        })
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
      localStorage.setItem("pro_monthly_words", newWordCount.toString())
      
      // Track messages (non-blocking)
      trackAnalytics("trackMessage", {
        conversationId: Date.now().toString(),
        role: "assistant",
        content: data.response,
        type: "text",
      }).catch(() => {})
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

      const updated = [...chatHistories, newChat]
      setChatHistories(updated)
      localStorage.setItem("chatHistories", JSON.stringify(updated))

      toast({
        title: "تم الحفظ",
        description: "تم حفظ المحادثة في حسابك بنجاح",
      })

      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "أهلاً بيك في ميليجي! 🚀 أنا مساعدك الذكي في كل شيء. كيف أساعدك اليوم؟",
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

  const downloadImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "Melegy Image Generate.png"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في تحميل الصورة", variant: "destructive" })
    }
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

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
      document.body.className = "bg-[#0a0b1a] text-white"
    } else {
      document.documentElement.classList.remove("dark")
      document.body.className = "bg-white text-black"
    }
  }

  const loadChatHistory = (chat: ChatHistory) => {
    setMessages(chat.messages)
    setShowChatHistory(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl" style={{ backgroundColor: 'hsl(var(--background))' }}>
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

      <Toaster />

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
              className={`w-full sm:w-auto max-w-[95%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[75%] p-2 sm:p-3 md:p-4 ${message.role === "user" ? "bg-purple-600/20 border-purple-500/30" : "bg-gray-800/50 border-gray-700"}`}
            >
              {message.designData ? (
                <div className="mb-3">
                  <DesignViewer
                    backgroundImage={message.designData.backgroundImage}
                    textLayer={message.designData.textLayer}
                  />
                </div>
              ) : message.imageUrl ? (
                <div className="mb-3 relative group">
                  <img
                    src={message.imageUrl || "/placeholder.svg"}
                    alt="Generated or attached"
                    className="rounded-lg max-w-full cursor-pointer"
                  onClick={() => setZoomedImage(message.imageUrl!)}
                  onError={(e) => {
                    // Retry loading the image after a delay
                    setTimeout(() => {
                      const target = e.target as HTMLImageElement
                      target.src = message.imageUrl!
                    }, 1000)
                  }}
                    onLoad={() => {
                      console.log("[v0] Image loaded successfully:", message.imageUrl)
                    }}
                    loading="eager"
                  />
                  {message.role === "assistant" && (
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => downloadImage(message.imageUrl!)}
                        className="bg-black/70 hover:bg-black"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
              {message.videoUrl && <video src={message.videoUrl} controls className="max-w-full rounded-lg mb-2" />}
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
                    className="flex items-center gap-1"
                  >
                    {playingAudio === message.id ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    {playingAudio === message.id ? "إيقاف" : "استمع"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigator.clipboard.writeText(message.content)}
                    className="flex items-center gap-1"
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
                  <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full" />
                  <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-purple-500">{countdown}</span>
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
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                <p className="text-sm text-gray-400">جاري تحليل الصورة...</p>
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
        <div className="px-4 py-2 border-t border-border">
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
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 shrink-0"
          >
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
                      <func.icon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 shrink-0" />
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
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>
      </form>

      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2744] rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">استنفدت حد التعديلات الشهري!</h3>
              <p className="text-gray-300 mb-6">
                لقد استخدمت 20 تعديلاً هذا الشهر في باقة Pro. ننصحك بالترقية لباقة الأساطير للحصول على 50 تعديلاً شهرياً!
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="/pricing"
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-bold hover:from-purple-600 hover:to-pink-700 transition-all"
                >
                  الترقية لباقة الأساطير
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
    </div>
  )
}

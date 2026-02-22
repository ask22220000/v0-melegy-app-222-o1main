"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { UsageIndicator } from "@/components/usage-indicator"
import { checkSubscriptionAccess } from "@/lib/subscription-check"
import { setActiveSubscription } from "@/lib/set-subscription"
import { canSendMessage, canGenerateImage, incrementMessageUsage, incrementImageUsage } from "@/lib/usage-tracker"
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Download,
  Copy,
  Volume2,
  VolumeX,
  Home,
  Crown,
  History,
  X,
  Moon,
  Sun,
  Plus,
  Image,
  FileText,
  Lightbulb,
  Heart,
  MessageSquare,
  FileSpreadsheet,
} from "lucide-react"
import Link from "next/link"
import { DesignViewer } from "@/components/design-viewer"

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

export default function ChatAdvancedPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "أهلاً بيك يا أسطورة! 👑 انت دلوقتي معاك استخدام بلا حدود للكلمات والصور والتحليل مع أولوية المعالجة القصوى. إيه اللي تحب نعمله النهاردة؟",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([])
  const [currentChatId, setCurrentChatId] = useState<string>("")
  const [readMode, setReadMode] = useState(false)
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()
  const [isListening, setIsListening] = useState(false)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [countdown, setCountdown] = useState(10)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  // Generate unique session ID for analytics tracking (UUID format for database)
  const [sessionId] = useState(() => crypto.randomUUID())
  const [conversationCreated, setConversationCreated] = useState(false)

  const [theme, setTheme] = useState<"light" | "dark">("dark")
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
    // Set active subscription to vip plan
    setActiveSubscription('vip')
    
    const checkAccess = async () => {
      const accessResult = await checkSubscriptionAccess('vip')
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
    inputRef.current?.focus()
  }, [messages, isLoading])

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
  }, [])

  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "ar-EG"

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        setIsListening(false)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  useEffect(() => {
    try {
      const savedHistories = localStorage.getItem("melegy_chat_histories_advanced")
      if (savedHistories) {
        setChatHistories(JSON.parse(savedHistories))
      }
    } catch (error) {
      console.error("[v0] Error loading chat histories:", error)
    }
  }, [])

  useEffect(() => {
    const startConversation = async () => {
      if (!currentChatId) {
        const newChatId = Date.now().toString()
        setCurrentChatId(newChatId)
      }
    }

    startConversation()
  }, [currentChatId])

  useEffect(() => {
    if (messages.length > 0) {
      try {
        const firstUserMsg = messages.find((msg) => msg.role === "user")?.content || "محادثة جديدة"
        const title = firstUserMsg.substring(0, 50)
        const chatDate = new Date().toLocaleDateString("ar-EG")

        const savedHistories = localStorage.getItem("melegy_chat_histories_advanced")
        const currentHistories: ChatHistory[] = savedHistories ? JSON.parse(savedHistories) : []

        const existingChatIndex = currentHistories.findIndex((chat) => chat.title === title && chat.date === chatDate)

        let updatedHistories
        if (existingChatIndex >= 0) {
          updatedHistories = [...currentHistories]
          updatedHistories[existingChatIndex] = {
            ...updatedHistories[existingChatIndex],
            messages: messages,
          }
        } else {
          const newChat = {
            id: Date.now().toString(),
            title,
            date: chatDate,
            messages: messages,
          }
          updatedHistories = [newChat, ...currentHistories]
        }

        localStorage.setItem("melegy_chat_histories_advanced", JSON.stringify(updatedHistories))
        setChatHistories(updatedHistories)
      } catch (error) {
        console.error("[v0] Error saving chat to localStorage:", error)
      }
    }
  }, [messages])



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
      "قم بتوليد صورة",
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
    ]

    return editKeywords.some((keyword) => text.includes(keyword))
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

  const handleSubmit = async (e?: React.FormEvent, suggestionText?: string) => {
    if (e) {
      e.preventDefault()
    }

    const messageToSend = suggestionText || input.trim()

    if (!messageToSend.trim() || isLoading) return

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

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageToSend,
      imageUrl: attachedImage?.url,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setAttachedImage(null)

    try {
      const isImageRequest = detectImageRequest(messageToSend)
      const isVideoRequest = detectVideoRequest(messageToSend)
      const isExcelRequest = detectExcelRequest(messageToSend)

      if (isExcelRequest) {
        const excelResponse = await fetch("/api/generate-excel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: messageToSend }),
        })

        if (!excelResponse.ok) {
          throw new Error("Failed to generate Excel")
        }

        const excelData = await excelResponse.json()

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: excelData.message || "تم إنشاء الشيت بنجاح! يمكنك تعديله وتحميله.",
          excelData: excelData.excelData,
        }

        setMessages((prev) => [...prev, assistantMessage])
        setIsLoading(false)
        return
      }

      if (isImageRequest) {
        await generateImageWithPrompt(messageToSend)
      } else if (isVideoRequest) {
        toast({
          title: "خاصية محذوفة",
          description: "تم إزالة خاصية توليد الفيديو. استخدم توليد الصور بدلاً منها.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      } else {
        const conversationHistory = messages.slice(-6).map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))

        const textResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: messageToSend,
            conversationHistory,
          }),
        })

        const responseData = await textResponse.json()

        if (!textResponse.ok || responseData.error) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: responseData.error || "معلش حصل خطأ، جرب تاني.",
          }
          setMessages((prev) => [...prev, assistantMessage])
          setIsLoading(false)
          return
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: responseData.response,
        }

        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error("Response error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "معلش حصل خطأ، جرب تاني.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (text: string) => {
    if (text === "اقرألي 📖") {
      setReadMode(true)
      const askMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "ابعتلي النص اللي عايزني أقراهولك",
      }
      setMessages((prev) => [...prev, askMessage])
    } else if (text === "اعملي صورة 🎨") {
      setInput("اعملي صورة لـ ")
    } else {
      setInput(text)
    }
  }

  const generateImageWithPrompt = async (userPrompt: string) => {
    try {
      setIsGeneratingImage(true)
      setCountdown(10)

      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          const newCount = prev - 1
          if (newCount <= 0) {
            return 0 // Stay at 0 until image loads
          }
          return newCount
        })
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
          content: "تم إنشاء التصميم بنجاح! يمكنك تعديل النص والألوان بحرية.",
          imageUrl: design.backgroundImage,
          designData: design,
        }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("[v0] Image generation error:", error)
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
      console.error("[v0] Image generation error:", error)
      setIsGeneratingImage(false)
      toast({
        title: "خطأ",
        description: "فشل في إنشاء الصورة",
        variant: "destructive",
      })
    }
  }

  const speakText = async (text: string, messageId: string) => {
    try {
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
          content: "أهلاً بيك يا أسطورة! 👑 انت دلوقتي معاك استخدام بلا حدود للكلمات والصور والتحليل مع أولوية المعالجة القصوى. إيه اللي تحب نعمله النهاردة؟",
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
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "ar-SA"
      utterance.rate = 1.0
      utterance.pitch = 1.0

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

  const playAudio = async (text: string, messageId: string) => {
    if (playingAudio === messageId) {
      setPlayingAudio(null)
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      return
    }

    try {
      setPlayingAudio(messageId)
      await speakText(text, messageId)
    } catch (error) {
      console.error("Error playing audio:", error)
    } finally {
      setPlayingAudio(null)
    }
  }

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setPlayingAudio(null)
    }
  }

  const toggleMicrophone = () => {
    if (!recognitionRef.current) {
      toast({
        title: "غير مدعوم",
        description: "المتصفح لا يدعم التعرف على الصوت",
        variant: "destructive",
      })
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (error) {
        console.error("[v0] Speech recognition error:", error)
        setIsListening(false)
      }
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "تم النسخ",
        description: "تم نسخ النص بنجاح",
      })
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في نسخ النص",
        variant: "destructive",
      })
    }
  }

  const handleChatHistoryClick = () => {
    setShowChatHistory(!showChatHistory)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const imageData = event.target?.result as string
          setAttachedImage({ url: imageData, name: file.name })
          setInput((prev) => prev + `\n[صورة مرفقة: ${file.name}]`)
          toast({
            title: "تم إرفاق الصورة",
            description: `تم إرفاق ${file.name} بنجاح`,
          })
        }
        reader.readAsDataURL(file)
      } else {
        setInput((prev) => prev + `\n[ملف مرفق: ${file.name}]`)
        toast({
          title: "تم إرفاق الملف",
          description: `تم إرفاق ${file.name} بنجاح`,
        })
      }
    }
  }

  const downloadImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `melegy-image-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("[v0] Download error:", error)
      toast({
        title: "خطأ",
        description: "فشل في تحميل الصورة",
        variant: "destructive",
      })
    }
  }

  const animateImage = async (imageUrl: string, animationPrompt?: string) => {
    try {
      const videoResponse = await fetch("/api/perplexity-image-to-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, prompt: animationPrompt || "" }),
      })

      if (!videoResponse.ok) {
        throw new Error("Failed to animate image")
      }

      const { videoUrl } = await videoResponse.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "تم تحريك الصورة بنجاح!",
        videoUrl,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("[v0] Animation error:", error)
      toast({
        title: "خطأ",
        description: "فشل في تحريك الصورة",
        variant: "destructive",
      })
    }
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

      <header className="flex items-center justify-between p-4 border-b border-gray-800 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 mt-20">
        <Link href="/" className="flex items-center gap-2 text-cyan-400">
          <Home className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent font-bold">
            باقة الأساطير
          </span>
          <Crown className="h-5 w-5 text-yellow-400" />
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">Lifetime</span>
        </div>
      </header>
      <Toaster />

      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <img src={zoomedImage || "/placeholder.svg"} alt="Zoomed" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {showChatHistory && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4"
          onClick={handleChatHistoryClick}
        >
          <Card
            className="w-full max-w-2xl bg-gray-900 p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4 text-center">سجل المحادثات</h2>
            {chatHistories.length === 0 ? (
              <p className="text-center text-gray-400">لا توجد محادثات سابقة</p>
            ) : (
              <div className="space-y-4">
                {chatHistories.map((chat) => (
                  <Card
                    key={chat.id}
                    className="p-4 bg-gray-800 hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => {
                      setMessages(chat.messages)
                      setShowChatHistory(false)
                    }}
                  >
                    <h3 className="font-semibold text-lg mb-2">{chat.title}</h3>
                    <p className="text-sm text-gray-400">{chat.date}</p>
                    <p className="text-sm text-gray-500 mt-2">{chat.messages.length} رسالة</p>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl pt-24 pb-32">
        <div className="mb-8 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4 border border-blue-500/30">
          <p className="text-center text-lg font-semibold text-blue-300">🚀 النسخة المتقدمة - بدون حدود استخدام</p>
        </div>

        {messages.length === 0 && (
          <div className="text-center mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                onClick={() => handleSuggestionClick("اكتبلي خطة عمل كاملة")}
                className="bg-gray-800 hover:bg-gray-700 border-gray-700 h-auto py-4"
              >
                <span className="text-sm">اكتبلي خطة عمل كاملة</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSuggestionClick("اعملي صورة 🎨")}
                className="bg-gray-800 hover:bg-gray-700 border-gray-700 h-auto py-4"
              >
                <span className="text-sm">اعملي صورة 🎨</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSuggestionClick("لخصلي المقال ده")}
                className="bg-gray-800 hover:bg-gray-700 border-gray-700 h-auto py-4"
              >
                <span className="text-sm">لخصلي المقال ده</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSuggestionClick("اقرألي 📖")}
                className="bg-gray-800 hover:bg-gray-700 border-gray-700 h-auto py-4"
              >
                <span className="text-sm">اقرألي 📖</span>
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-24">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <Card
                className={`w-full sm:w-auto max-w-[95%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[75%] p-2 sm:p-3 md:p-4 ${
                  message.role === "user" ? "bg-blue-900/30 border-blue-500/30" : "bg-amber-100/50 border-amber-200"
                }`}
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
                      className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setZoomedImage(message.imageUrl!)}
                    />
                    {message.role === "assistant" && (
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="secondary" onClick={() => downloadImage(message.imageUrl!)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}

                {message.videoUrl && (
                  <div className="mt-3">
                    <video controls className="w-full rounded-lg" style={{ maxHeight: "400px" }}>
                      <source src={message.videoUrl} type="video/mp4" />
                    </video>
                    <a
                      href={message.videoUrl}
                      download="melegy-video.mp4"
                      className="mt-2 inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                    >
                      <Download className="h-4 w-4" />
                      تحميل الفيديو
                    </a>
                  </div>
                )}

                {message.excelData && (
                  <div className="mb-3">
                    <div className="space-y-3">
                      {message.excelData.headers &&
                      message.excelData.rows &&
                      Array.isArray(message.excelData.headers) &&
                      Array.isArray(message.excelData.rows) ? (
                        <>
                          <div className="overflow-x-auto border border-gray-700 rounded-lg">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-800">
                                <tr>
                                  {message.excelData.headers.map((header, i) => (
                                    <th
                                      key={i}
                                      className="px-4 py-2 text-right font-semibold text-gray-200 border-b border-gray-700"
                                    >
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {message.excelData.rows.map((row, rowIndex) => (
                                  <tr
                                    key={rowIndex}
                                    className={rowIndex % 2 === 0 ? "bg-gray-900/50" : "bg-gray-800/50"}
                                  >
                                    {Array.isArray(row) &&
                                      row.map((cell, cellIndex) => (
                                        <td
                                          key={cellIndex}
                                          className="px-4 py-2 text-right text-gray-300 border-b border-gray-700/50"
                                        >
                                          {cell ?? ""}
                                        </td>
                                      ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <button
                            onClick={() => {
                              try {
                                const BOM = "\uFEFF"
                                const csvContent =
                                  BOM +
                                  [
                                    message.excelData!.headers.map((h) => `"${h}"`).join(","),
                                    ...message.excelData!.rows.map((row) =>
                                      Array.isArray(row) ? row.map((cell) => `"${cell}"`).join(",") : "",
                                    ),
                                  ].join("\n")
                                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
                                const url = URL.createObjectURL(blob)
                                const link = document.createElement("a")
                                link.href = url
                                link.download = `data-${Date.now()}.csv`
                                link.click()
                                URL.revokeObjectURL(url)
                              } catch (error) {
                                console.error("[v0] CSV download error:", error)
                              }
                            }}
                            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                          >
                            <Download className="h-4 w-4" />
                            تحميل الملف (.csv)
                          </button>
                        </>
                      ) : (
                        <p className="text-red-400">خطأ في تنسيق البيانات</p>
                      )}
                    </div>
                  </div>
                )}

                <p
                  className="chat-message whitespace-pre-wrap break-words leading-relaxed text-xs font-bold"
                  style={{ fontFamily: "Cairo, sans-serif", fontSize: "12px", fontWeight: "bold", color: message.role === "assistant" ? "#fff" : undefined }}
                >
                  {message.content}
                </p>

                {message.role === "assistant" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => playAudio(message.content, message.id)}
                      className="flex items-center gap-1"
                    >
                      {playingAudio === message.id ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      {playingAudio === message.id ? "إيقاف" : "استمع"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(message.content)}
                      className="flex items-center gap-1"
                    >
                      <Copy className="h-4 w-4" />
                      نسخ
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
                      <span className="text-2xl font-bold text-purple-500">...{countdown}...</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">جاري إنشاء الصورة...</p>
                </div>
              </Card>
            </div>
          )}

          {isLoading && !isGeneratingImage && (
            <div className="flex justify-start">
              <Card className="max-w-[80%] p-4 bg-gray-800 border-gray-700">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200" />
                </div>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-[#0a0b1a]/95 backdrop-blur-sm border-t border-gray-800/50 p-4">
          <div className="container mx-auto max-w-4xl">
            {attachedImage && (
              <div className="mb-2 p-2 bg-gray-800 rounded-lg flex items-center justify-between">
                <span className="text-sm">📎 {attachedImage.name}</span>
                <Button size="sm" variant="ghost" onClick={() => setAttachedImage(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="fixed bottom-0 left-0 right-0 p-4 border-t border-border bg-background z-40" style={{ backgroundColor: 'hsl(var(--background))' }}>
              <div className="flex gap-2 items-center max-w-4xl mx-auto relative">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 shrink-0"
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
                            <func.icon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500 shrink-0" />
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
          </div>
        </div>
        <Toaster />
      </div>
    </div>
  )
}

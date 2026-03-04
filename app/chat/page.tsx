"use client"

import { useState, useEffect, useRef } from "react"
import { useApp } from "@/lib/contexts/AppContext"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { DesignViewer } from "@/components/design-viewer"
import { UserIdModal } from "@/components/user-id-modal"
import Link from "next/link"
import { UsageIndicator } from "@/components/usage-indicator"
import { canSendMessage, canGenerateImage, incrementMessageUsage, incrementImageUsage } from "@/lib/usage-tracker"
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
  Languages,
  Film,
  Share2,
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

export default function ChatPage() {
  const { translations, language, setLanguage } = useApp()

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "أهلاً بيك في ميليجي! 👋 أنا مساعدك الذكي. كيف أقدر أساعدك النهاردة؟",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([])
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showFunctionsMenu, setShowFunctionsMenu] = useState(false)
  const [showUsageCard, setShowUsageCard] = useState(true)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [mlgUserId, setMlgUserId] = useState<string | null>(null)
  const [mlgPlan, setMlgPlan] = useState<string>("free")
  const [showUserModal, setShowUserModal] = useState(false)
  // Animate-image states
  const [showAnimateModal, setShowAnimateModal] = useState(false)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [animateImageUrl, setAnimateImageUrl] = useState<string>("")
  const [animatePrompt, setAnimatePrompt] = useState<string>("")
  const [animateMode, setAnimateMode] = useState<"i2v" | "r2v">("i2v")
  const animateFileRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const functionsList = [
    { id: "image", label: translations.fn_image, icon: Image, prompt: language === "ar" ? "اعملي صورة " : "Generate an image of " },
    { id: "edit-image", label: translations.fn_editImage, icon: Image, action: "attach-edit-image" },
    { id: "animate-image", label: translations.fn_animateImage, icon: Film, action: "animate-image" },
    { id: "attach-file", label: translations.fn_attachFile, icon: Paperclip, action: "attach-file" },
    { id: "write", label: translations.fn_write, icon: FileText, prompt: language === "ar" ? "اكتبلي " : "Write for me " },
    { id: "excel", label: translations.fn_excel, icon: FileSpreadsheet, prompt: language === "ar" ? "اعملي شيت Excel ل " : "Create an Excel sheet for " },
    { id: "idea", label: translations.fn_idea, icon: Lightbulb, prompt: language === "ar" ? "اقترحلي فكرة عن " : "Suggest an idea about " },
    { id: "help", label: translations.fn_help, icon: Heart, prompt: language === "ar" ? "ساعدني في " : "Help me with " },
    { id: "chat", label: translations.fn_chat, icon: MessageSquare, prompt: language === "ar" ? "عايز اتكلم معاك عن " : "I want to talk about " },
  ]

  const handleAnimateImage = async () => {
    if (!animateImageUrl || !animatePrompt.trim()) return
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
        body: JSON.stringify({ imageUrl: animateImageUrl, prompt: animatePrompt, mode: animateMode }),
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Initialize user: check localStorage for existing ID
  useEffect(() => {
    const storedId = localStorage.getItem("mlg_user_id")
    const storedPlan = localStorage.getItem("mlg_plan") || "free"
    if (storedId) {
      // Verify it still exists on server
      fetch(`/api/user?id=${storedId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.user) {
            setMlgUserId(data.user.mlg_user_id)
            setMlgPlan(data.user.plan)
          } else {
            // ID invalid, show modal
            localStorage.removeItem("mlg_user_id")
            localStorage.removeItem("mlg_plan")
            setShowUserModal(true)
          }
        })
        .catch(() => {
          // On error keep stored values
          setMlgUserId(storedId)
          setMlgPlan(storedPlan)
        })
    } else {
      setShowUserModal(true)
    }
  }, [])

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

    try {
      const savedHistories = localStorage.getItem("melegy_chat_histories_free")
      if (savedHistories) {
        setChatHistories(JSON.parse(savedHistories))
      }
    } catch (error) {
      console.error("Error loading chat histories:", error)
    }
  }, [])

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
    const lowerText = text.toLowerCase()
    
    // Must explicitly request Excel/sheet creation
    const explicitExcelKeywords = [
      "اعمل شيت",
      "اعملي شيت",
      "عاوز شيت",
      "ولد شيت",
      "انشئ شيت",
      "اعمل excel",
      "اعمل اكسيل",
      "اعمل جدول",
      "ولد excel",
      "ولد اكسيل",
      "create excel",
      "generate excel",
      "make excel",
      "create sheet",
      "generate sheet"
    ]
    
    return explicitExcelKeywords.some((keyword) => lowerText.includes(keyword))
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

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return

    const supportedTypes = [
      "image/",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "audio/mpeg",
      "audio/mp3"
    ]

    const isSupported = supportedTypes.some(type => file.type.startsWith(type) || file.type === type)

    if (!isSupported) {
      toast({
        title: "نوع ملف غير مدعوم",
        description: "من فضلك ارفع: صورة، PDF، Word، Excel أو MP3",
        variant: "destructive",
      })
      return
    }

    // For images, compress and show preview
    if (file.type.startsWith("image/")) {
      try {
        // Import compression utility dynamically
        const { compressImage } = await import("@/lib/imageCompression")
        
        toast({
          title: "جاري ضغط الصورة...",
          description: "من فضلك انتظر",
        })
        
        const compressedDataUrl = await compressImage(file, 5) // Max 5MB
        
        setAttachedImage({
          url: compressedDataUrl,
          name: file.name,
        })
        
        toast({
          title: "تم ضغط الصورة بنجاح",
          description: "يمكنك الآن إرسال رسالتك",
        })
      } catch (error: any) {
        toast({
          title: "خطأ في معالجة الصورة",
          description: error.message || "حاول مرة أخرى",
          variant: "destructive",
        })
      }
    } 
    // For other files, process immediately
    else {
      setIsLoading(true)
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("prompt", input || "قم بتحليل هذا الملف")

        const response = await fetch("/api/upload-file", {
          method: "POST",
          body: formData,
        })

        const data = await response.json()

        if (!response.ok || data.error) {
          throw new Error(data.error || "فشل رفع الملف")
        }

        // Add AI response with file analysis
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "user",
            content: `📎 ${file.name}: ${input || "تحليل الملف"}`,
          },
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.content,
          },
        ])

        setInput("")
        toast({
          title: "تم معالجة الملف بنجاح",
          description: `تم تحليل ${file.name}`,
        })
      } catch (error: any) {
        toast({
          title: "فشل معالجة الملف",
          description: error.message,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const generateImageWithPrompt = async (userPrompt: string) => {
    const imageCheck = canGenerateImage()
    if (!imageCheck.allowed) {
      toast({
        title: "انتهت الصور اليومية",
        description: imageCheck.reason,
        variant: "destructive",
      })
      setShowUpgradeModal(true)
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
        await incrementImageUsage()
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

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if ((!input.trim() && !attachedImage) || isLoading) return

    const messageCheck = canSendMessage()
    if (!messageCheck.allowed) {
      toast({
        title: "انتهت الرسائل اليومية",
        description: messageCheck.reason,
        variant: "destructive",
      })
      setShowUpgradeModal(true)
      return
    }

    const messageToSend = input.trim()
    setInput("")
    setIsLoading(true)

    if (attachedImage && detectImageEditRequest(messageToSend, true)) {
      const imageCheck = canGenerateImage()
      if (!imageCheck.allowed) {
        toast({
          title: "انتهت الصور اليومية",
          description: imageCheck.reason,
          variant: "destructive",
        })
        setShowUpgradeModal(true)
        setIsLoading(false)
        return
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: messageToSend,
        imageUrl: attachedImage.url,
      }

      setMessages((prev) => [...prev, userMessage])

      const tempAttachedImage = attachedImage
      setAttachedImage(null)

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

        await incrementImageUsage()
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
        await incrementMessageUsage()
        return
      }

      if (isImageRequest) {
        await generateImageWithPrompt(currentInput)
        setIsLoading(false)
        await incrementMessageUsage()
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
        await incrementMessageUsage()
        return
      }

      const conversationHistory = messages.slice(-6).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      const now = new Date()
      const clientDateTime = now.toLocaleString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZoneName: "short",
      })

      const response = await fetch("/api/perplexity-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentInput,
          conversationHistory,
          clientDateTime,
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
      await incrementMessageUsage()
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
    // Stop if already playing this message
    if (playingAudio === messageId) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current.src = ""
        currentAudioRef.current = null
      }
      setPlayingAudio(null)
      return
    }

    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.src = ""
      currentAudioRef.current = null
    }
    setPlayingAudio(messageId)

    try {
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      const contentType = response.headers.get("content-type") || ""

      if (!contentType.includes("audio")) {
        // API returned an error JSON
        const json = await response.json().catch(() => ({}))
        throw new Error(json.error || "ElevenLabs did not return audio")
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }

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
      }

      try {
        await audio.play()
      } catch (playErr: any) {
        console.error("[v0] play() error:", playErr?.message)
        setPlayingAudio(null)
        URL.revokeObjectURL(audioUrl)
        currentAudioRef.current = null
      }
    } catch (error: any) {
      console.error("[v0] TTS fetch error:", error?.message)
      setPlayingAudio(null)
      currentAudioRef.current = null
    }
  }

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

    const newChat: ChatHistory = {
      id: Date.now().toString(),
      title: title.substring(0, 50),
      date: new Date().toLocaleDateString("ar-EG"),
      messages: messages,
    }

    const updated = [...chatHistories, newChat]
    setChatHistories(updated)
    localStorage.setItem("melegy_chat_histories_free", JSON.stringify(updated))

    toast({
      title: "تم الحفظ",
      description: "تم حفظ المحادثة بنجاح",
    })

    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "أهلاً بيك في ميليجي! 👋 أنا مساعدك الذكي، معاك 10 رسائل و3 صور يومياً في الخطة المجانية. كيف أقدر أساعدك؟",
      },
    ])
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
    localStorage.setItem("theme", newTheme)

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
      document.body.className = "bg-[#0a0b1a] text-white"
    } else {
      document.documentElement.classList.remove("dark")
      document.body.className = "bg-white text-black"
    }
  }

  const handleUserReady = (userId: string, plan: string, isNew: boolean) => {
    setMlgUserId(userId)
    setMlgPlan(plan)
    setShowUserModal(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={language === "ar" ? "rtl" : "ltr"} style={{ backgroundColor: 'hsl(var(--background))' }}>
      <Toaster />
      {showUserModal && <UserIdModal onUserReady={handleUserReady} />}
      
      <div className="fixed top-0 left-0 right-0 z-[100] bg-background border-b border-border py-2 md:py-4" style={{ backgroundColor: 'hsl(var(--background))' }}>
        <div className="flex items-center justify-between px-2 sm:px-4 md:px-6">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <button
              onClick={saveCurrentConversation}
              className="bg-card border-2 border-border text-foreground px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-lg transition-all duration-300 hover:bg-accent hover:border-accent-foreground/50 hover:shadow-lg hover:scale-105 flex items-center gap-1 sm:gap-1.5 cursor-pointer font-medium text-xs sm:text-sm"
              aria-label={translations.save}
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{translations.save}</span>
            </button>
            <button
              onClick={() => setShowChatHistory(!showChatHistory)}
              className="bg-card border-2 border-border text-foreground px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-lg transition-all duration-300 hover:bg-accent hover:border-accent-foreground/50 hover:shadow-lg hover:scale-105 flex items-center gap-1 sm:gap-1.5 cursor-pointer font-medium text-xs sm:text-sm"
              aria-label={translations.chatHistory}
            >
              <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{translations.history2}</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <Link
              href="/"
              className="bg-card border-2 border-border text-foreground px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg transition-all duration-300 hover:bg-accent hover:border-accent-foreground/50 hover:shadow-lg hover:scale-105 flex items-center"
            >
              <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{translations.home}</span>
            </Link>
            <button
              onClick={toggleTheme}
              className="bg-card border-2 border-border text-foreground px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg transition-all duration-300 hover:bg-accent hover:border-accent-foreground/50 hover:shadow-lg hover:scale-105 flex items-center cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </button>
            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="bg-card border-2 border-border text-foreground px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg transition-all duration-300 hover:bg-accent hover:border-accent-foreground/50 hover:shadow-lg hover:scale-105 flex items-center gap-1 cursor-pointer font-bold text-xs sm:text-sm"
              aria-label="Toggle language"
            >
              <Languages className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{translations.languageToggle}</span>
            </button>
            <button
              onClick={() => setShowUsageCard(!showUsageCard)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 flex items-center cursor-pointer border-none"
              aria-label="عرض حدود الاستخدام"
              title="عرض/إخفاء حدود الاستخدام"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {showUsageCard && (
        <>
          {/* Desktop - Fixed sidebar */}
          <div className="fixed left-4 top-32 z-40 w-64 hidden md:block">
            <UsageIndicator />
          </div>
          
          {/* Mobile - Modal overlay */}
          <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setShowUsageCard(false)}>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm" onClick={(e) => e.stopPropagation()}>
              <UsageIndicator />
            </div>
          </div>
        </>
      )}

      {showChatHistory && (
        <div className="absolute top-16 left-4 z-50 w-72 max-h-96 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <span className="font-bold">{translations.chatHistory}</span>
            <Button variant="ghost" size="sm" onClick={() => setShowChatHistory(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {chatHistories.length === 0 ? (
            <p className="p-4 text-gray-500 text-center">{translations.noHistory}</p>
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
            src={zoomedImage}
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
                    src={message.imageUrl}
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
                    <Download className="h-4 w-4 mr-1" /> {translations.downloadExcel}
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
                    {playingAudio === message.id ? translations.stop : translations.listen}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyText(message.content)}
                    className="flex items-center gap-1 text-gray-400 hover:text-white"
                  >
                    <Copy className="h-4 w-4" /> {translations.copy}
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
                <p className="text-sm text-gray-400">{translations.generatingImage}</p>
              </div>
            </Card>
          </div>
        )}

        {isAnalyzingImage && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-6 bg-gray-800 border-gray-700">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-400">{translations.analyzingImage}</p>
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
                <p className="text-sm text-gray-400" style={{ fontFamily: "Cairo, sans-serif" }}>
                  {translations.generatingVideo}
                </p>
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
            <img src={attachedImage.url} alt="preview" className="h-20 rounded-lg" />
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
            placeholder={translations.typePlaceholder}
            className="flex-1 bg-card border-border text-xs font-bold resize-none min-h-[44px] max-h-[200px] overflow-y-auto pr-3"
            style={{ fontFamily: "Cairo, sans-serif", fontSize: "12px", fontWeight: "bold" }}
            dir={language === "ar" ? "rtl" : "ltr"}
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
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,audio/*" 
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </div>
      </form>

      {/* Animate Image Modal */}
      {showAnimateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowAnimateModal(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Film className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>حرك صورة</h2>
              </div>
              <button onClick={() => setShowAnimateModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Image picker */}
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>الصورة</p>
              {animateImageUrl ? (
                <div className="relative inline-block">
                  <img src={animateImageUrl} alt="preview" className="h-24 rounded-lg border border-gray-700" />
                  <button onClick={() => setAnimateImageUrl("")} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => animateFileRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm transition-colors"
                    style={{ fontFamily: "Cairo, sans-serif" }}
                  >
                    <Image className="h-4 w-4" /> ارفع صورة
                  </button>
                  {messages.filter((m) => m.imageUrl).length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>أو اختر من الشات</p>
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                        {messages.filter((m) => m.imageUrl).slice(-6).map((m) => (
                          <img
                            key={m.id}
                            src={m.imageUrl}
                            alt="chat img"
                            className="h-16 w-16 object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-purple-500 transition-all"
                            onClick={() => setAnimateImageUrl(m.imageUrl!)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <input
                ref={animateFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = (ev) => setAnimateImageUrl(ev.target?.result as string)
                  reader.readAsDataURL(file)
                }}
              />
            </div>

            {/* Mode toggle */}
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>نوع الفيديو</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setAnimateMode("i2v")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors border ${animateMode === "i2v" ? "bg-purple-600/30 border-purple-500 text-purple-300" : "bg-gray-800 border-gray-600 text-gray-400"}`}
                  style={{ fontFamily: "Cairo, sans-serif" }}
                >
                  تحريك الصورة
                </button>
                <button
                  onClick={() => setAnimateMode("r2v")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors border ${animateMode === "r2v" ? "bg-purple-600/30 border-purple-500 text-purple-300" : "bg-gray-800 border-gray-600 text-gray-400"}`}
                  style={{ fontFamily: "Cairo, sans-serif" }}
                >
                  مشهد جديد (مرجع)
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: "Cairo, sans-serif" }}>
                {animateMode === "i2v" ? "الصورة هتتحرك بشكل سلس (10 ثانية)" : "الشخصية هتظهر في مشهد جديد حسب البرومبت (10 ثانية)"}
              </p>
            </div>

            {/* Prompt */}
            <div className="mb-5">
              <p className="text-xs text-gray-400 mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>البرومبت (عربي أو إنجليزي)</p>
              <textarea
                value={animatePrompt}
                onChange={(e) => setAnimatePrompt(e.target.value)}
                placeholder={animateMode === "i2v" ? "مثال: الشعر يتحرك مع الريح..." : "مثال: الشخصية بتمشي في الشارع..."}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm resize-none min-h-[80px] focus:outline-none focus:border-purple-500"
                style={{ fontFamily: "Cairo, sans-serif" }}
                dir="rtl"
              />
            </div>

            <button
              onClick={handleAnimateImage}
              disabled={!animateImageUrl || !animatePrompt.trim()}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              style={{ fontFamily: "Cairo, sans-serif" }}
            >
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">{translations.upgradeTitle}</h3>
              <p className="text-gray-300 mb-6">
                {translations.upgradeDesc}
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowUpgradeModal(false)}
                  variant="outline"
                  className="flex-1 border-gray-600"
                >
                  {translations.cancelBtn}
                </Button>
                <Link href="/pricing" className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                    {translations.upgradeBtn}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

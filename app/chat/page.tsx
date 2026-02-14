"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import Link from "next/link"
import {
  Send,
  Loader2,
  Copy,
  Mic,
  MicOff,
  Paperclip,
  X,
  Moon,
  Sun,
  Home,
  Image as ImageIcon,
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  imageUrl?: string
  videoUrl?: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "أهلاً! 👋 أنا ميليجي، مساعدك الذكي. ازاي أقدر أساعدك النهاردة؟",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

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
  }, [])

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

  const detectImageRequest = (text: string): boolean => {
    const imageKeywords = [
      "اعمللي صورة",
      "اعملي صورة",
      "اعمل صورة",
      "عاوز صورة",
      "عايز صورة",
      "ولد صورة",
      "توليد صورة",
      "صمملي صورة",
    ]
    return imageKeywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()))
  }

  const detectVideoRequest = (text: string): boolean => {
    const videoKeywords = ["فيديو", "video", "عاوز فيديو", "عايز فيديو", "اعمل فيديو", "ولد فيديو"]
    return videoKeywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()))
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

  const handleFileUpload = (e: any) => {
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

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const messageToSend = input.trim()
    setInput("")
    setIsLoading(true)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageToSend,
      imageUrl: attachedImage?.url,
    }

    setMessages((prev) => [...prev, userMessage])
    setAttachedImage(null)

    try {
      const isImageRequest = detectImageRequest(messageToSend)
      const isVideoRequest = detectVideoRequest(messageToSend)

      if (isImageRequest) {
        toast({
          title: "ترقى لباقة المحترف",
          description: "توليد الصور متاح في الباقات المدفوعة فقط",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (isVideoRequest) {
        toast({
          title: "ترقى لباقة المحترف",
          description: "توليد الفيديوهات متاح في الباقات المدفوعة فقط",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const conversationHistory = messages.slice(-6).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...conversationHistory, { role: "user", content: messageToSend }],
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedText = ""

      if (reader) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "",
        }

        setMessages((prev) => [...prev, assistantMessage])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          accumulatedText += chunk

          setMessages((prev) => {
            const newMessages = [...prev]
            const lastMessage = newMessages[newMessages.length - 1]
            if (lastMessage.role === "assistant") {
              lastMessage.content = accumulatedText
            }
            return newMessages
          })
        }

        // Check if it's an image response
        if (accumulatedText.includes("[صورة]")) {
          const imageUrl = accumulatedText.split("\n")[1]
          setMessages((prev) => {
            const newMessages = [...prev]
            const lastMessage = newMessages[newMessages.length - 1]
            if (lastMessage.role === "assistant") {
              lastMessage.content = "تم توليد الصورة بنجاح! 🎨"
              lastMessage.imageUrl = imageUrl
            }
            return newMessages
          })
        }

        // Check if it's a video response
        if (accumulatedText.includes("[فيديو]")) {
          const videoUrl = accumulatedText.split("\n")[1]
          setMessages((prev) => {
            const newMessages = [...prev]
            const lastMessage = newMessages[newMessages.length - 1]
            if (lastMessage.role === "assistant") {
              lastMessage.content = "تم توليد الفيديو بنجاح! 🎥"
              lastMessage.videoUrl = videoUrl
            }
            return newMessages
          })
        }
      }
    } catch (error) {
      console.error("[v0] Chat error:", error)
      toast({
        title: "حصل خطأ",
        description: "حاول مرة تانية",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "تم النسخ",
      description: "تم نسخ الرد للحافظة",
    })
  }

  return (
    <div className={`flex min-h-screen flex-col ${theme === "dark" ? "bg-[#0a0b1a] text-white" : "bg-white text-black"}`}>
      <Toaster />
      
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b ${theme === "dark" ? "border-gray-800 bg-[#0f1020]/90" : "border-gray-200 bg-white/90"} backdrop-blur-sm`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <Home className="h-4 w-4" />
                الرئيسية
              </Button>
            </Link>
            <h1 className="text-xl font-bold">💬 محادثة مع ميليجي</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/pricing">
              <Button variant="outline" size="sm" className="gap-2">
                ⚡ ترقية
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`max-w-[80%] p-4 ${
                  message.role === "user"
                    ? theme === "dark"
                      ? "bg-blue-600/20 text-white"
                      : "bg-blue-50 text-black"
                    : theme === "dark"
                      ? "bg-[#1a1b2e] text-white"
                      : "bg-gray-50 text-black"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
                
                {message.imageUrl && (
                  <div className="mt-3">
                    <img
                      src={message.imageUrl}
                      alt="Generated or uploaded"
                      className="max-h-96 w-full rounded-lg object-contain"
                    />
                  </div>
                )}

                {message.videoUrl && (
                  <div className="mt-3">
                    <video
                      src={message.videoUrl}
                      controls
                      className="max-h-96 w-full rounded-lg"
                    />
                  </div>
                )}

                {message.role === "assistant" && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(message.content)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className={`sticky bottom-0 border-t ${theme === "dark" ? "border-gray-800 bg-[#0f1020]" : "border-gray-200 bg-white"}`}>
        <div className="mx-auto max-w-4xl px-4 py-4">
          {attachedImage && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-600/10 p-2">
              <ImageIcon className="h-4 w-4" />
              <span className="flex-1 text-sm">{attachedImage.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAttachedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleListening}
              disabled={isLoading}
              className={isListening ? "bg-red-600" : ""}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              className="min-h-[50px] flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              disabled={isLoading}
            />

            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>

          <p className="mt-2 text-center text-xs text-gray-500">
            💡 جرب: "اشرحلي الذكاء الاصطناعي" أو "اديني نصيحة للنجاح"
          </p>
        </div>
      </div>
    </div>
  )
}

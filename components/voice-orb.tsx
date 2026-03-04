"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, MicOff } from "lucide-react"

type OrbState = "idle" | "listening" | "thinking" | "speaking"

interface VoiceOrbProps {
  onClose: () => void
  /** Pass recent chat messages for context */
  chatHistory?: { role: "user" | "assistant"; content: string }[]
}

export function VoiceOrb({ onClose, chatHistory = [] }: VoiceOrbProps) {
  const [orbState, setOrbState] = useState<OrbState>("idle")
  const [transcript, setTranscript] = useState("")
  const [reply, setReply] = useState("")
  const [error, setError] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>(
    chatHistory.slice(-6)
  )

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // ── Canvas Orb animation ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    let t = 0

    const draw = () => {
      const W = canvas.width
      const H = canvas.height
      const cx = W / 2
      const cy = H / 2
      const baseR = W * 0.32

      ctx.clearRect(0, 0, W, H)

      // Get audio amplitude if speaking / listening
      let amplitude = 0
      if (analyserRef.current && (orbState === "speaking" || orbState === "listening")) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(data)
        amplitude = data.reduce((a, b) => a + b, 0) / data.length / 128
      }

      const pulse =
        orbState === "speaking"
          ? 1 + amplitude * 0.35 + Math.sin(t * 0.08) * 0.04
          : orbState === "listening"
          ? 1 + Math.sin(t * 0.05) * 0.06 + amplitude * 0.15
          : orbState === "thinking"
          ? 1 + Math.sin(t * 0.04) * 0.03
          : 1 + Math.sin(t * 0.015) * 0.015

      const R = baseR * pulse

      // Outer glow
      const outerGlow = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.3)
      outerGlow.addColorStop(
        0,
        orbState === "listening"
          ? "rgba(0,220,130,0.18)"
          : orbState === "speaking"
          ? `rgba(80,160,255,${0.15 + amplitude * 0.25})`
          : orbState === "thinking"
          ? "rgba(160,100,255,0.12)"
          : "rgba(30,80,180,0.08)"
      )
      outerGlow.addColorStop(1, "rgba(0,0,0,0)")
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.3, 0, Math.PI * 2)
      ctx.fillStyle = outerGlow
      ctx.fill()

      // Main sphere gradient
      const sphereGrad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.05, cx, cy, R)
      sphereGrad.addColorStop(0, "rgba(60,120,255,0.95)")
      sphereGrad.addColorStop(0.4, "rgba(20,60,160,0.9)")
      sphereGrad.addColorStop(0.75, "rgba(10,20,80,0.95)")
      sphereGrad.addColorStop(1, "rgba(5,10,40,1)")
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = sphereGrad
      ctx.fill()

      // Inner glow core (color shifts by state)
      const coreR = R * (orbState === "speaking" ? 0.42 + amplitude * 0.12 : 0.38)
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR)
      if (orbState === "listening") {
        coreGrad.addColorStop(0, "rgba(0,255,160,0.95)")
        coreGrad.addColorStop(0.5, "rgba(0,200,120,0.6)")
        coreGrad.addColorStop(1, "rgba(0,100,80,0)")
      } else if (orbState === "speaking") {
        coreGrad.addColorStop(0, `rgba(${180 + amplitude * 75},${220 + amplitude * 35},255,0.98)`)
        coreGrad.addColorStop(0.4, "rgba(80,160,255,0.7)")
        coreGrad.addColorStop(1, "rgba(30,80,200,0)")
      } else if (orbState === "thinking") {
        coreGrad.addColorStop(0, "rgba(200,140,255,0.9)")
        coreGrad.addColorStop(0.5, "rgba(140,80,220,0.5)")
        coreGrad.addColorStop(1, "rgba(80,30,160,0)")
      } else {
        coreGrad.addColorStop(0, "rgba(140,200,255,0.7)")
        coreGrad.addColorStop(0.5, "rgba(60,120,220,0.4)")
        coreGrad.addColorStop(1, "rgba(20,60,160,0)")
      }
      ctx.beginPath()
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
      ctx.fillStyle = coreGrad
      ctx.fill()

      // Speaking waveform bars
      if (orbState === "speaking" && analyserRef.current) {
        const bars = 24
        const barData = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(barData)
        for (let i = 0; i < bars; i++) {
          const angle = (i / bars) * Math.PI * 2 - Math.PI / 2
          const barH = (barData[i * 3] / 255) * R * 0.28 + R * 0.04
          const x1 = cx + Math.cos(angle) * (R * 0.55)
          const y1 = cy + Math.sin(angle) * (R * 0.55)
          const x2 = cx + Math.cos(angle) * (R * 0.55 + barH)
          const y2 = cy + Math.sin(angle) * (R * 0.55 + barH)
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.strokeStyle = `rgba(150,210,255,${0.4 + (barData[i * 3] / 255) * 0.5})`
          ctx.lineWidth = 2.5
          ctx.lineCap = "round"
          ctx.stroke()
        }
      }

      // Listening pulse rings
      if (orbState === "listening") {
        for (let k = 1; k <= 3; k++) {
          const ringR = R * (1.1 + k * 0.18) * (1 + Math.sin(t * 0.07 - k) * 0.04)
          const alpha = Math.max(0, 0.25 - k * 0.07 + amplitude * 0.12)
          ctx.beginPath()
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(0,220,130,${alpha})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      // Highlight gloss
      const glossGrad = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.35, 0, cx - R * 0.1, cy - R * 0.2, R * 0.5)
      glossGrad.addColorStop(0, "rgba(255,255,255,0.18)")
      glossGrad.addColorStop(1, "rgba(255,255,255,0)")
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = glossGrad
      ctx.fill()

      t++
      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [orbState])

  // ── Auto-start recording when overlay opens ───────────────────────────────
  useEffect(() => {
    startListening()
    return () => {
      stopAllAudio()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    analyserRef.current = null
  }

  // ── Connect audio source to analyser for visualisation ───────────────────
  const connectAnalyser = (source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode) => {
    const analyser = audioCtxRef.current!.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyser.connect(audioCtxRef.current!.destination)
    analyserRef.current = analyser
  }

  // ── Start recording ───────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    setError("")
    setTranscript("")
    setReply("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up audio context for orb visualisation while listening
      audioCtxRef.current = new AudioContext()
      const micSource = audioCtxRef.current.createMediaStreamSource(stream)
      connectAnalyser(micSource)

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = handleRecordingStop
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      setOrbState("listening")
    } catch {
      setError("تعذّر الوصول للميكروفون")
    }
  }, [])

  // ── Stop recording ────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsRecording(false)
    setOrbState("thinking")
  }, [])

  // ── Process audio after recording stops ──────────────────────────────────
  const handleRecordingStop = useCallback(async () => {
    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
    if (blob.size < 1000) {
      setError("لم يُكتشف صوت — حاول مرة أخرى")
      setOrbState("idle")
      return
    }

    setOrbState("thinking")

    // ── Step 1: STT ──
    const form = new FormData()
    form.append("audio", blob, "audio.webm")
    const sttRes = await fetch("/api/voice/stt", { method: "POST", body: form })
    const sttData = await sttRes.json()
    if (!sttRes.ok || !sttData.text) {
      setError(sttData.error || "فشل التعرف على الصوت")
      setOrbState("idle")
      return
    }
    setTranscript(sttData.text)

    // ── Step 2: LLM Chat ──
    const chatRes = await fetch("/api/voice/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: sttData.text, history: conversationHistory }),
    })
    const chatData = await chatRes.json()
    if (!chatRes.ok || !chatData.reply) {
      setError(chatData.error || "فشل الحصول على رد")
      setOrbState("idle")
      return
    }
    setReply(chatData.reply)
    setConversationHistory((prev) => [
      ...prev,
      { role: "user", content: sttData.text },
      { role: "assistant", content: chatData.reply },
    ])

    // ── Step 3: TTS ──
    await speakReply(chatData.reply)
  }, [conversationHistory])

  // ── Convert reply text to speech ─────────────────────────────────────────
  const speakReply = async (text: string) => {
    setOrbState("speaking")
    try {
      const ttsRes = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!ttsRes.ok) throw new Error("TTS failed")

      const arrayBuffer = await ttsRes.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: "audio/mpeg" })
      const url = URL.createObjectURL(blob)

      // Stop old audio context, make new one for playback visualisation
      if (audioCtxRef.current) {
        await audioCtxRef.current.close()
      }
      audioCtxRef.current = new AudioContext()

      const audio = new Audio(url)
      audioRef.current = audio
      const src = audioCtxRef.current.createMediaElementSource(audio)
      connectAnalyser(src)

      audio.onended = () => {
        URL.revokeObjectURL(url)
        setOrbState("listening")
        // Auto-restart listening for loop
        startListening()
      }
      await audio.play()
    } catch {
      setError("فشل تشغيل الصوت")
      setOrbState("idle")
    }
  }

  const handleClose = () => {
    cancelAnimationFrame(animFrameRef.current)
    stopAllAudio()
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    onClose()
  }

  const stateLabel =
    orbState === "listening"
      ? "اتكلم الآن..."
      : orbState === "thinking"
      ? "ميليجي بيفكر..."
      : orbState === "speaking"
      ? "ميليجي بيتكلم"
      : "جاهز"

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm">
      {/* Close */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
        aria-label="إغلاق"
      >
        <X className="h-7 w-7" />
      </button>

      {/* Orb */}
      <canvas
        ref={canvasRef}
        width={320}
        height={320}
        className="mb-6"
        style={{ imageRendering: "auto" }}
      />

      {/* State label */}
      <p
        className="text-white/70 text-base font-medium mb-4 tracking-wide"
        style={{ fontFamily: "Cairo, sans-serif" }}
      >
        {stateLabel}
      </p>

      {/* Transcript */}
      {transcript && (
        <div
          className="max-w-sm text-center text-white/50 text-sm mb-2 px-4"
          style={{ fontFamily: "Cairo, sans-serif" }}
          dir="rtl"
        >
          <span className="text-white/30 text-xs block mb-1">أنت قلت:</span>
          {transcript}
        </div>
      )}

      {/* Reply */}
      {reply && (
        <div
          className="max-w-sm text-center text-cyan-300/80 text-sm px-4"
          style={{ fontFamily: "Cairo, sans-serif" }}
          dir="rtl"
        >
          <span className="text-cyan-400/40 text-xs block mb-1">ميليجي:</span>
          {reply}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm mt-2" style={{ fontFamily: "Cairo, sans-serif" }}>
          {error}
        </p>
      )}

      {/* Stop / Tap to stop recording button */}
      {isRecording && (
        <button
          onClick={stopListening}
          className="mt-8 flex items-center gap-2 px-6 py-3 bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 rounded-full text-red-300 text-sm font-bold transition-colors"
          style={{ fontFamily: "Cairo, sans-serif" }}
        >
          <MicOff className="h-4 w-4" />
          اضغط لإيقاف التسجيل
        </button>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, MicOff } from "lucide-react"

type OrbState = "idle" | "listening" | "thinking" | "speaking"

interface VoiceOrbProps {
  onClose: () => void
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
  const orbStateRef = useRef<OrbState>("idle")

  // Keep ref in sync with state so canvas can read latest value
  useEffect(() => {
    orbStateRef.current = orbState
  }, [orbState])

  // ── Canvas Orb — pixel-accurate recreation of the GIF ─────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    let t = 0
    let running = true

    const draw = () => {
      if (!running) return
      const W = canvas.width
      const H = canvas.height
      const cx = W / 2
      const cy = H / 2
      const baseR = W * 0.375
      const state = orbStateRef.current

      ctx.clearRect(0, 0, W, H)

      // Live amplitude
      let amplitude = 0
      let freqData: Uint8Array | null = null
      if (analyserRef.current) {
        freqData = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(freqData)
        amplitude = freqData.reduce((a, b) => a + b, 0) / freqData.length / 128
      }

      const pulse =
        state === "speaking" ? 1 + amplitude * 0.10 + Math.sin(t * 0.055) * 0.018
        : state === "listening" ? 1 + Math.sin(t * 0.05) * 0.022
        : state === "thinking"  ? 1 + Math.sin(t * 0.03) * 0.012
        : 1 + Math.sin(t * 0.018) * 0.008

      const R = baseR * pulse

      // ── Outer ambient glow ──
      const ambG = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.7)
      ambG.addColorStop(0, "rgba(10,40,140,0.30)")
      ambG.addColorStop(0.4, "rgba(5,20,80,0.14)")
      ambG.addColorStop(0.75, "rgba(2,8,40,0.06)")
      ambG.addColorStop(1, "rgba(0,0,0,0)")
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.7, 0, Math.PI * 2)
      ctx.fillStyle = ambG
      ctx.fill()

      // ── Main dark glass sphere ──
      // Offset the gradient center top-left for 3D glass look (matches GIF)
      const sphG = ctx.createRadialGradient(
        cx - R * 0.22, cy - R * 0.22, R * 0.08,
        cx + R * 0.08, cy + R * 0.12, R * 1.05
      )
      sphG.addColorStop(0,    "rgba(22,52,130,1)")
      sphG.addColorStop(0.28, "rgba(10,25,75,1)")
      sphG.addColorStop(0.55, "rgba(5,12,45,1)")
      sphG.addColorStop(0.78, "rgba(2,6,24,1)")
      sphG.addColorStop(1,    "rgba(0,2,10,1)")
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = sphG
      ctx.fill()
      ctx.restore()

      // ── Clip everything inside the sphere ──
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.995, 0, Math.PI * 2)
      ctx.clip()

      // ── Internal color haze (teal bottom-center, purple bottom-right like GIF) ──
      const hazeT = t * 0.008
      // Teal patch (bottom-center, shifts slowly)
      const tealX = cx + Math.sin(hazeT) * R * 0.08
      const tealY = cy + R * 0.18 + Math.cos(hazeT * 0.7) * R * 0.06
      const tealG = ctx.createRadialGradient(tealX, tealY, 0, tealX, tealY, R * 0.72)
      tealG.addColorStop(0,   "rgba(0,210,190,0.30)")
      tealG.addColorStop(0.35,"rgba(0,160,200,0.18)")
      tealG.addColorStop(0.65,"rgba(0,80,160,0.08)")
      tealG.addColorStop(1,   "rgba(0,0,0,0)")
      ctx.fillStyle = tealG
      ctx.fillRect(0, 0, W, H)

      // Purple patch (bottom-right)
      const purpX = cx + R * 0.28 + Math.sin(hazeT * 1.2) * R * 0.05
      const purpY = cy + R * 0.22
      const purpG = ctx.createRadialGradient(purpX, purpY, 0, purpX, purpY, R * 0.55)
      purpG.addColorStop(0,   "rgba(120,30,200,0.22)")
      purpG.addColorStop(0.4, "rgba(80,20,160,0.12)")
      purpG.addColorStop(1,   "rgba(0,0,0,0)")
      ctx.fillStyle = purpG
      ctx.fillRect(0, 0, W, H)

      // ── Dot mesh texture (exactly like GIF) ──
      const DOT_SPACING = 9
      const DOT_R = 1.0
      const startX = cx - R - DOT_SPACING
      const startY = cy - R - DOT_SPACING
      const colCount = Math.ceil((R * 2 + DOT_SPACING * 2) / DOT_SPACING)
      const rowCount = colCount
      for (let row = 0; row < rowCount; row++) {
        for (let col = 0; col < colCount; col++) {
          const dx = startX + col * DOT_SPACING
          const dy = startY + row * DOT_SPACING
          const dist = Math.hypot(dx - cx, dy - cy)
          if (dist > R * 0.97) continue
          const norm = dist / R // 0=center, 1=edge
          const edgeFade = Math.pow(1 - norm, 0.6)
          // Proximity-to-core brightens color and alpha
          const glowFade = Math.max(0, 1 - dist / (R * 0.50))
          const alpha = edgeFade * (0.10 + glowFade * 0.60)
          // Teal at core → blue → purple at outer
          const rr = Math.round(20 + glowFade * 10)
          const gg = Math.round(170 + glowFade * 80)
          const bb = Math.round(215 + glowFade * 30)
          ctx.beginPath()
          ctx.arc(dx, dy, DOT_R, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${rr},${gg},${bb},${alpha.toFixed(2)})`
          ctx.fill()
        }
      }

      // ── Central pill glow (the glowing "IK" zone from GIF) ──
      const coreAnim = state === "speaking"
        ? 1 + amplitude * 0.40 + Math.sin(t * 0.09) * 0.05
        : state === "listening"
        ? 1 + Math.sin(t * 0.07) * 0.12
        : state === "thinking"
        ? 0.85 + Math.sin(t * 0.04) * 0.08
        : 0.75 + Math.sin(t * 0.025) * 0.05

      const coreW = R * 0.48 * coreAnim
      const coreH = R * 0.22 * coreAnim

      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(1, coreH / coreW)

      const coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, coreW)
      if (state === "speaking") {
        const b2 = 0.88 + amplitude * 0.12
        coreG.addColorStop(0,    `rgba(${Math.round(210*b2)},${Math.round(245*b2)},255,1)`)
        coreG.addColorStop(0.20, `rgba(80,210,255,${0.90*b2})`)
        coreG.addColorStop(0.50, `rgba(0,170,230,${0.55*b2})`)
        coreG.addColorStop(0.78, `rgba(40,30,200,${0.18*b2})`)
        coreG.addColorStop(1,    "rgba(0,0,0,0)")
      } else if (state === "listening") {
        coreG.addColorStop(0,    "rgba(200,248,255,0.98)")
        coreG.addColorStop(0.28, "rgba(0,210,240,0.78)")
        coreG.addColorStop(0.58, "rgba(0,130,210,0.42)")
        coreG.addColorStop(1,    "rgba(0,0,0,0)")
      } else if (state === "thinking") {
        coreG.addColorStop(0,    "rgba(210,170,255,0.92)")
        coreG.addColorStop(0.35, "rgba(150,60,255,0.55)")
        coreG.addColorStop(0.70, "rgba(80,20,180,0.20)")
        coreG.addColorStop(1,    "rgba(0,0,0,0)")
      } else {
        coreG.addColorStop(0,    "rgba(140,210,255,0.72)")
        coreG.addColorStop(0.45, "rgba(40,110,230,0.38)")
        coreG.addColorStop(1,    "rgba(0,0,0,0)")
      }
      ctx.beginPath()
      ctx.arc(0, 0, coreW, 0, Math.PI * 2)
      ctx.fillStyle = coreG
      ctx.fill()
      ctx.restore()

      // ── Speaking frequency bars (radial, inside sphere) ──
      if (state === "speaking" && freqData) {
        const BARS = 36
        for (let i = 0; i < BARS; i++) {
          const angle = (i / BARS) * Math.PI * 2 - Math.PI / 2
          const v = freqData[Math.floor(i * (freqData.length / BARS))] / 255
          const barH = v * R * 0.20 + R * 0.015
          const innerR = R * 0.46
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR)
          ctx.lineTo(cx + Math.cos(angle) * (innerR + barH), cy + Math.sin(angle) * (innerR + barH))
          ctx.strokeStyle = `rgba(90,215,255,${0.28 + v * 0.65})`
          ctx.lineWidth = 1.8
          ctx.lineCap = "round"
          ctx.stroke()
        }
      }

      ctx.restore() // end sphere clip

      // ── Rim light (blue-teal edge glow like GIF) ──
      const rimG = ctx.createRadialGradient(cx, cy, R * 0.82, cx, cy, R * 1.04)
      rimG.addColorStop(0,    "rgba(0,0,0,0)")
      rimG.addColorStop(0.55, "rgba(0,150,180,0.07)")
      rimG.addColorStop(0.80, "rgba(15,90,170,0.22)")
      rimG.addColorStop(0.94, "rgba(0,160,190,0.10)")
      rimG.addColorStop(1,    "rgba(0,0,0,0)")
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.04, 0, Math.PI * 2)
      ctx.fillStyle = rimG
      ctx.fill()

      // ── Glass specular top-left ──
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.clip()
      const glossG = ctx.createRadialGradient(
        cx - R * 0.40, cy - R * 0.44, 0,
        cx - R * 0.18, cy - R * 0.22, R * 0.54
      )
      glossG.addColorStop(0,   "rgba(255,255,255,0.15)")
      glossG.addColorStop(0.5, "rgba(210,235,255,0.05)")
      glossG.addColorStop(1,   "rgba(255,255,255,0)")
      ctx.fillStyle = glossG
      ctx.fillRect(0, 0, W, H)
      ctx.restore()

      // ── Listening pulse rings (expanding outward) ──
      if (state === "listening") {
        for (let k = 0; k < 3; k++) {
          const phase = ((t * 0.032) - k * 0.75 + 10) % 1
          const ringR = R * (1.06 + phase * 0.52)
          const alpha = Math.max(0, (1 - phase) * 0.16)
          ctx.beginPath()
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(0,200,220,${alpha.toFixed(3)})`
          ctx.lineWidth = 1.0
          ctx.stroke()
        }
      }

      t++
      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)
    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, []) // runs once — reads orbStateRef for live state

  // ── Auto-start on mount ──────────────────────────────────────────────────
  useEffect(() => {
    startListening()
    return () => stopAllAudio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    analyserRef.current = null
  }

  const getOrCreateAudioCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext()
    }
    return audioCtxRef.current
  }

  // ── Start recording ───────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    setError("")
    setTranscript("")
    setReply("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const actx = getOrCreateAudioCtx()
      const micSource = actx.createMediaStreamSource(stream)
      const analyser = actx.createAnalyser()
      analyser.fftSize = 256
      micSource.connect(analyser)
      // Do NOT connect analyser to destination — avoids mic feedback
      analyserRef.current = analyser

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm"
      const recorder = new MediaRecorder(stream, { mimeType })
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Stop recording ────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop())
      streamRef.current = null
    }
    setIsRecording(false)
    setOrbState("thinking")
    analyserRef.current = null
  }, [])

  // ── Process after recording ──────────────────────────────────────────────
  const handleRecordingStop = useCallback(async () => {
    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
    if (blob.size < 800) {
      setError("لم يُكتشف صوت — اضغط وتكلم ثم اضغط للإيقاف")
      setOrbState("idle")
      return
    }
    setOrbState("thinking")

    // ── STT — Groq Whisper ──
    const form = new FormData()
    form.append("audio", blob, "audio.webm")
    let sttText = ""
    try {
      const sttRes = await fetch("/api/voice/stt", { method: "POST", body: form })
      const sttData = await sttRes.json()
      if (!sttRes.ok || !sttData.text) throw new Error(sttData.error || "فشل التعرف على الصوت")
      sttText = sttData.text
      setTranscript(sttText)
    } catch (e: any) {
      setError(e.message)
      setOrbState("idle")
      return
    }

    // ── LLM — Groq (Egyptian dialect) ──
    let replyText = ""
    try {
      const chatRes = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sttText, history: conversationHistory }),
      })
      const chatData = await chatRes.json()
      if (!chatRes.ok || !chatData.reply) throw new Error(chatData.error || "فشل الحصول على رد")
      replyText = chatData.reply
      setReply(replyText)
      setConversationHistory((prev) => [
        ...prev,
        { role: "user", content: sttText },
        { role: "assistant", content: replyText },
      ])
    } catch (e: any) {
      setError(e.message)
      setOrbState("idle")
      return
    }

    // ── TTS — ElevenLabs (stream directly) ──
    await speakReply(replyText)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationHistory])

  // ── TTS with streaming playback ──────────────────────────────────────────
  const speakReply = async (text: string) => {
    setOrbState("speaking")
    try {
      const ttsRes = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!ttsRes.ok) throw new Error("TTS request failed")

      const arrayBuffer = await ttsRes.arrayBuffer()
      if (!arrayBuffer.byteLength) throw new Error("Empty audio response")

      const blob = new Blob([arrayBuffer], { type: "audio/mpeg" })
      const url = URL.createObjectURL(blob)

      // Close previous audio context cleanly
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        await audioCtxRef.current.close()
        audioCtxRef.current = null
      }

      const audio = new Audio(url)
      audioRef.current = audio

      // Set up analyser AFTER audio is loaded to avoid InvalidStateError
      audio.addEventListener("canplay", () => {
        try {
          const actx = getOrCreateAudioCtx()
          const src = actx.createMediaElementSource(audio)
          const analyser = actx.createAnalyser()
          analyser.fftSize = 256
          src.connect(analyser)
          analyser.connect(actx.destination)
          analyserRef.current = analyser
        } catch {
          // Fallback: play without analyser visualisation
        }
      }, { once: true })

      audio.onended = () => {
        URL.revokeObjectURL(url)
        analyserRef.current = null
        setOrbState("listening")
        startListening()
      }

      audio.onerror = () => {
        setError("خطأ في تشغيل الصوت")
        setOrbState("idle")
      }

      await audio.play()
    } catch (e: any) {
      setError(`فشل تشغيل الصوت: ${e.message}`)
      setOrbState("idle")
    }
  }

  const handleClose = () => {
    cancelAnimationFrame(animFrameRef.current)
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    stopAllAudio()
    onClose()
  }

  const stateLabel =
    orbState === "listening" ? "اتكلم دلوقتي..."
    : orbState === "thinking" ? "ميليجي بيفكر..."
    : orbState === "speaking" ? "ميليجي بيتكلم"
    : "جاهز"

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/96 backdrop-blur-md">
      {/* Close */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 text-white/40 hover:text-white/80 transition-colors"
        aria-label="إغلاق"
      >
        <X className="h-7 w-7" />
      </button>

      {/* Orb canvas */}
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        style={{ width: 400, height: 400 }}
      />

      {/* State label */}
      <p
        className="text-white/65 text-[15px] font-medium mt-2 mb-5 tracking-wide"
        style={{ fontFamily: "Cairo, sans-serif" }}
      >
        {stateLabel}
      </p>

      {/* Transcript */}
      {transcript && (
        <div
          className="max-w-xs text-center mb-2 px-4"
          dir="rtl"
          style={{ fontFamily: "Cairo, sans-serif" }}
        >
          <span className="block text-white/25 text-xs mb-1">قلت:</span>
          <span className="text-white/55 text-sm leading-relaxed">{transcript}</span>
        </div>
      )}

      {/* Reply */}
      {reply && (
        <div
          className="max-w-xs text-center px-4"
          dir="rtl"
          style={{ fontFamily: "Cairo, sans-serif" }}
        >
          <span className="block text-cyan-400/35 text-xs mb-1">ميليجي:</span>
          <span className="text-cyan-300/75 text-sm leading-relaxed">{reply}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          className="text-red-400/80 text-sm mt-3 px-4 text-center"
          style={{ fontFamily: "Cairo, sans-serif" }}
          dir="rtl"
        >
          {error}
        </p>
      )}

      {/* Stop recording button */}
      {isRecording && (
        <button
          onClick={stopListening}
          className="mt-8 flex items-center gap-2 px-7 py-3 rounded-full text-sm font-bold transition-all
            bg-red-500/15 hover:bg-red-500/30 border border-red-500/35 text-red-300/90"
          style={{ fontFamily: "Cairo, sans-serif" }}
        >
          <MicOff className="h-4 w-4" />
          اضغط لإيقاف التسجيل
        </button>
      )}
    </div>
  )
}

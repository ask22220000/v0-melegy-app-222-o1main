"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, MicOff, Mic } from "lucide-react"
import { canUseVoiceChatSync, incrementVoiceUsage, fetchUsage, getUserPlan, PLAN_LIMITS } from "@/lib/usage-tracker"

type OrbState = "idle" | "listening" | "thinking" | "speaking"

// ─────────────────────────────────────────────────────────────────────────────
// Orb Canvas — fully crash-safe for mobile browsers
// ─────────────────────────────────────────────────────────────────────────────
function OrbCanvas({
  orbStateRef,
  analyserRef,
}: {
  orbStateRef: React.MutableRefObject<OrbState>
  analyserRef: React.MutableRefObject<AnalyserNode | null>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Safe getContext — returns null on some Android WebViews
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let t = 0
    let alive = true

    const draw = () => {
      if (!alive) return
      const W = canvas.width
      const H = canvas.height
      const cx = W / 2
      const cy = H / 2
      const state = orbStateRef.current

      let amp = 0
      let freqData: Uint8Array | null = null
      if (analyserRef.current) {
        try {
          freqData = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(freqData)
          amp = freqData.reduce((a, b) => a + b, 0) / freqData.length / 128
        } catch { /* analyser closed */ }
      }

      const pulse =
        state === "speaking"  ? 1 + amp * 0.08 + Math.sin(t * 0.05) * 0.016
        : state === "listening" ? 1 + Math.sin(t * 0.045) * 0.020
        : state === "thinking"  ? 1 + Math.sin(t * 0.028) * 0.010
        :                         1 + Math.sin(t * 0.016) * 0.007

      const R = W * 0.375 * pulse
      ctx.clearRect(0, 0, W, H)

      // outer glow
      const ag = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.85)
      ag.addColorStop(0,    "rgba(8,35,130,0.35)")
      ag.addColorStop(0.38, "rgba(4,16,72,0.15)")
      ag.addColorStop(0.70, "rgba(1,6,32,0.05)")
      ag.addColorStop(1,    "rgba(0,0,0,0)")
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.85, 0, Math.PI * 2)
      ctx.fillStyle = ag; ctx.fill()

      // sphere body
      const sg = ctx.createRadialGradient(cx - R * 0.20, cy - R * 0.20, R * 0.06, cx + R * 0.10, cy + R * 0.14, R * 1.05)
      sg.addColorStop(0,    "rgba(20,48,120,1)")
      sg.addColorStop(0.25, "rgba(9,22,66,1)")
      sg.addColorStop(0.52, "rgba(4,10,38,1)")
      sg.addColorStop(0.80, "rgba(1,4,18,1)")
      sg.addColorStop(1,    "rgba(0,1,8,1)")
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = sg; ctx.fill(); ctx.restore()

      // inner elements clipped
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.994, 0, Math.PI * 2); ctx.clip()

      // teal haze
      const ht = t * 0.006
      const hx = cx + Math.sin(ht) * R * 0.06
      const hy = cy + R * 0.15 + Math.cos(ht * 0.8) * R * 0.05
      const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.78)
      hg.addColorStop(0,    "rgba(0,215,195,0.34)")
      hg.addColorStop(0.32, "rgba(0,165,210,0.20)")
      hg.addColorStop(0.62, "rgba(0,75,165,0.09)")
      hg.addColorStop(1,    "rgba(0,0,0,0)")
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H)

      // purple haze
      const px = cx + R * 0.26 + Math.sin(ht * 1.1) * R * 0.04
      const py = cy + R * 0.20
      const pg = ctx.createRadialGradient(px, py, 0, px, py, R * 0.58)
      pg.addColorStop(0,    "rgba(130,25,215,0.26)")
      pg.addColorStop(0.40, "rgba(85,15,165,0.13)")
      pg.addColorStop(1,    "rgba(0,0,0,0)")
      ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H)

      // dot mesh
      const SP = 8
      const ox = cx - R; const oy = cy - R
      const cols2 = Math.ceil(R * 2 / SP) + 2
      const rows2 = Math.ceil(R * 2 / SP) + 2
      for (let r = 0; r < rows2; r++) {
        for (let c = 0; c < cols2; c++) {
          const dx = ox + c * SP; const dy = oy + r * SP
          const d = Math.hypot(dx - cx, dy - cy)
          if (d > R * 0.97) continue
          const ef  = Math.pow(Math.max(0, 1 - d / R), 0.55)
          const gf  = Math.max(0, 1 - d / (R * 0.46))
          const alpha = ef * (0.08 + gf * 0.72)
          ctx.beginPath(); ctx.arc(dx, dy, 0.95, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${Math.round(40 + gf * 10)},${Math.round(168 + gf * 82)},${Math.round(212 + gf * 38)},${alpha.toFixed(2)})`
          ctx.fill()
        }
      }

      // eye capsules
      const cAnim =
        state === "speaking"  ? 1 + amp * 0.45 + Math.sin(t * 0.09) * 0.06
        : state === "listening" ? 1 + Math.sin(t * 0.07) * 0.14
        : state === "thinking"  ? 0.88 + Math.sin(t * 0.04) * 0.10
        :                         0.74 + Math.sin(t * 0.022) * 0.06
      const eW = R * 0.175 * cAnim; const eH = R * 0.090 * cAnim
      const eSep = R * 0.26; const eBR = eH * 0.55
      let glowR = 0, glowG = 200, glowB = 230
      if (state === "speaking")  { glowR = 100; glowG = 220; glowB = 255 }
      else if (state === "listening") { glowR = 0; glowG = 235; glowB = 215 }
      else if (state === "thinking")  { glowR = 190; glowG = 130; glowB = 255 }
      const blinkY = state === "speaking" ? Math.abs(Math.sin(t * 0.18)) * 0.45 + 0.55 : 1.0

      const drawEye = (ex: number, ey: number) => {
        ctx.save(); ctx.translate(ex, ey); ctx.scale(1, blinkY)
        const eyeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, eW * 1.3)
        eyeGrad.addColorStop(0,    `rgba(${glowR},${glowG},${glowB},0.45)`)
        eyeGrad.addColorStop(0.55, `rgba(${glowR},${glowG},${glowB},0.18)`)
        eyeGrad.addColorStop(1,    "rgba(0,0,0,0)")
        ctx.beginPath(); ctx.ellipse(0, 0, eW * 1.3, eH * 1.6, 0, 0, Math.PI * 2)
        ctx.fillStyle = eyeGrad; ctx.fill()
        ctx.beginPath()
        ctx.moveTo(-eW + eBR, -eH); ctx.lineTo(eW - eBR, -eH)
        ctx.quadraticCurveTo(eW, -eH, eW, -eH + eBR); ctx.lineTo(eW, eH - eBR)
        ctx.quadraticCurveTo(eW, eH, eW - eBR, eH); ctx.lineTo(-eW + eBR, eH)
        ctx.quadraticCurveTo(-eW, eH, -eW, eH - eBR); ctx.lineTo(-eW, -eH + eBR)
        ctx.quadraticCurveTo(-eW, -eH, -eW + eBR, -eH); ctx.closePath()
        const cg = ctx.createLinearGradient(-eW, -eH, eW, eH)
        cg.addColorStop(0,   `rgba(${glowR + 20},${glowG},${glowB},0.85)`)
        cg.addColorStop(0.5, `rgba(${glowR},${Math.round(glowG * 0.75)},${glowB},0.70)`)
        cg.addColorStop(1,   `rgba(${Math.round(glowR * 0.6)},${Math.round(glowG * 0.5)},${Math.min(glowB + 20, 255)},0.55)`)
        ctx.fillStyle = cg; ctx.fill()
        ctx.strokeStyle = `rgba(${glowR + 40},${Math.min(glowG + 20, 255)},255,0.30)`
        ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore()
      }
      drawEye(cx - eSep, cy); drawEye(cx + eSep, cy)

      const symFontSize = Math.round(eH * 1.65)
      ctx.save()
      ctx.font = `bold ${symFontSize}px monospace`
      ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.shadowColor = `rgba(${glowR},${glowG},${glowB},1)`; ctx.shadowBlur = eH * 3.0
      ctx.fillStyle = `rgba(255,255,255,${state === "thinking" ? 0.65 : 0.96})`
      ctx.fillText("|", cx - eSep, cy); ctx.fillText("<", cx + eSep, cy)
      ctx.restore()

      // freq bars
      if (state === "speaking" && freqData) {
        const BARS = 40
        for (let i = 0; i < BARS; i++) {
          const angle = (i / BARS) * Math.PI * 2 - Math.PI / 2
          const v = freqData[Math.floor(i * (freqData.length / BARS))] / 255
          const bH = v * R * 0.18 + R * 0.012
          const ir = R * 0.47
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(angle) * ir, cy + Math.sin(angle) * ir)
          ctx.lineTo(cx + Math.cos(angle) * (ir + bH), cy + Math.sin(angle) * (ir + bH))
          ctx.strokeStyle = `rgba(85,215,255,${(0.25 + v * 0.68).toFixed(2)})`
          ctx.lineWidth = 1.7; ctx.lineCap = "round"; ctx.stroke()
        }
      }

      ctx.restore()

      // rim + specular
      const rg = ctx.createRadialGradient(cx, cy, R * 0.80, cx, cy, R * 1.06)
      rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(0.52, "rgba(0,145,175,0.07)")
      rg.addColorStop(0.78, "rgba(12,85,165,0.24)"); rg.addColorStop(0.94, "rgba(0,155,185,0.10)")
      rg.addColorStop(1, "rgba(0,0,0,0)")
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2); ctx.fillStyle = rg; ctx.fill()

      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip()
      const gg2 = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, 0, cx - R * 0.16, cy - R * 0.20, R * 0.55)
      gg2.addColorStop(0, "rgba(255,255,255,0.14)"); gg2.addColorStop(0.5, "rgba(205,232,255,0.05)"); gg2.addColorStop(1, "rgba(255,255,255,0)")
      ctx.fillStyle = gg2; ctx.fillRect(0, 0, W, H); ctx.restore()

      // pulse rings
      if (state === "listening") {
        for (let k = 0; k < 3; k++) {
          const phase = (((t * 0.030) - k * 0.72 + 12) % 1 + 1) % 1
          const rr = R * (1.06 + phase * 0.55)
          const al = Math.max(0, (1 - phase) * 0.15)
          ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(0,200,220,${al.toFixed(3)})`; ctx.lineWidth = 1.0; ctx.stroke()
        }
      }

      t++
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      alive = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [orbStateRef, analyserRef])

  const SIZE = 420
  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      style={{ width: "min(80vmin, 420px)", height: "min(80vmin, 420px)" }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Detect the best supported MIME type for MediaRecorder (mobile-safe)
// ─────────────────────────────────────────────────────────────────────────────
function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ]
  if (typeof MediaRecorder === "undefined") return "audio/webm"
  for (const t of types) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t
    } catch { /* skip */ }
  }
  return "" // let browser pick
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Voice Chat Page
// ─────────────────────────────────────────────────────────────────────────────
export default function VoiceChatPage() {
  const router = useRouter()
  const [orbState, setOrbState]     = useState<OrbState>("idle")
  const [transcript, setTranscript] = useState("")
  const [reply, setReply]           = useState("")
  const [errorMsg, setErrorMsg]     = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [voiceStats, setVoiceStats] = useState<{ used: number; limit: number } | null>(null)
  const [isSupported, setIsSupported] = useState(true)

  const orbStateRef      = useRef<OrbState>("idle")
  const analyserRef      = useRef<AnalyserNode | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef   = useRef<Blob[]>([])
  const audioRef         = useRef<HTMLAudioElement | null>(null)
  const streamRef        = useRef<MediaStream | null>(null)
  const audioCtxRef      = useRef<AudioContext | null>(null)
  const historyRef       = useRef<{ role: string; content: string }[]>([])
  const sessionStartRef  = useRef<number | null>(null)

  // Check browser support on mount
  useEffect(() => {
    const hasMedia = typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function"
    const hasMR = typeof MediaRecorder !== "undefined"
    if (!hasMedia || !hasMR) {
      setIsSupported(false)
      setErrorMsg("متصفحك لا يدعم التسجيل الصوتي. يرجى استخدام Chrome أو Safari.")
    }
  }, [])

  // Load voice stats on mount
  useEffect(() => {
    fetchUsage()
      .then((usage) => {
        const plan  = getUserPlan()
        const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS].voiceMinutesPerDay
        setVoiceStats({ used: usage.voice_minutes, limit })
      })
      .catch(() => setVoiceStats({ used: 0, limit: -1 }))
  }, [])

  // Keep orbState ref in sync
  useEffect(() => { orbStateRef.current = orbState }, [orbState])

  // Cleanup on unmount
  const stopAllAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    analyserRef.current = null
  }, [])

  useEffect(() => () => stopAllAudio(), [stopAllAudio])

  // AudioContext — created inside a user gesture to satisfy mobile policies
  const getAudioCtx = useCallback(() => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
        if (!AC) return null
        audioCtxRef.current = new AC()
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {})
      }
      return audioCtxRef.current
    } catch {
      return null
    }
  }, [])

  // TTS: fetch audio → connect analyser → play
  const speakReply = useCallback(async (tashkeelText: string) => {
    setOrbState("speaking")
    orbStateRef.current = "speaking"
    try {
      const ttsRes = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: tashkeelText, speed: 1.2 }),
      })
      if (!ttsRes.ok) throw new Error(`TTS ${ttsRes.status}`)
      const arrayBuffer = await ttsRes.arrayBuffer()
      if (!arrayBuffer.byteLength) throw new Error("الصوت فارغ")

      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
        audioRef.current = null
      }

      const url   = URL.createObjectURL(new Blob([arrayBuffer], { type: "audio/mpeg" }))
      const audio = new Audio(url)
      audio.volume = 1.0
      audioRef.current = audio

      // Wire AudioContext analyser (non-critical — skip if unavailable)
      const actx = getAudioCtx()
      if (actx) {
        try {
          const src      = actx.createMediaElementSource(audio)
          const analyser = actx.createAnalyser()
          analyser.fftSize = 256
          const gain = actx.createGain()
          gain.gain.value = 2.5
          src.connect(analyser); analyser.connect(gain); gain.connect(actx.destination)
          analyserRef.current = analyser
        } catch { /* already connected or unsupported */ }
      }

      await audio.play()
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve()
        audio.onerror = () => resolve()
      })
      URL.revokeObjectURL(url)
      audioRef.current = null
      analyserRef.current = null
      setOrbState("idle")
      orbStateRef.current = "idle"
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "خطأ غير معروف"
      setErrorMsg(`فشل تشغيل الصوت: ${msg}`)
      setOrbState("idle")
      orbStateRef.current = "idle"
    }
  }, [getAudioCtx])

  // processAudio: STT → LLM → TTS
  const processAudio = useCallback(async () => {
    const mimeType = getSupportedMimeType()
    const blobType = mimeType || "audio/webm"
    const blob = new Blob(audioChunksRef.current, { type: blobType })
    audioChunksRef.current = []

    if (blob.size < 500) {
      setErrorMsg("مفيش صوت — اتكلم وضغط إيقاف")
      setOrbState("idle")
      return
    }

    setOrbState("thinking")
    orbStateRef.current = "thinking"

    // STT
    const form = new FormData()
    // Use .webm or .mp4 extension depending on type
    const ext  = blobType.includes("mp4") ? "mp4" : "webm"
    form.append("audio", blob, `audio.${ext}`)
    let sttText = ""
    try {
      const res  = await fetch("/api/voice/stt", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok || !data.text?.trim()) throw new Error(data.error || "مفيش كلام واضح")
      sttText = data.text.trim()
      setTranscript(sttText)
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "خطأ في التعرف على الصوت")
      setOrbState("idle")
      return
    }

    // LLM
    try {
      const res  = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sttText, history: historyRef.current.slice(-8) }),
      })
      const data = await res.json()
      if (!res.ok || !data.reply) throw new Error(data.error || "فشل الرد")
      const replyText = data.reply.trim()
      setReply(replyText)
      historyRef.current = [
        ...historyRef.current,
        { role: "user",      content: sttText },
        { role: "assistant", content: replyText },
      ]
      await speakReply(replyText)
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "خطأ في الاتصال")
      setOrbState("idle")
    }
  }, [speakReply])

  // Start recording
  const startListening = useCallback(async () => {
    if (!isSupported) return

    // Check limit (sync — uses in-memory cache, safe in event handler)
    const voiceCheck = canUseVoiceChatSync()
    if (!voiceCheck.allowed) {
      setErrorMsg(voiceCheck.reason || "تجاوزت الحد المسموح للدردشة الصوتية اليوم")
      return
    }

    setErrorMsg(""); setTranscript(""); setReply("")
    sessionStartRef.current = Date.now()

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      })
    } catch {
      setErrorMsg("لازم تسمح بالوصول للميكروفون")
      return
    }
    streamRef.current = stream

    // Mic analyser for orb (non-critical)
    const actx = getAudioCtx()
    if (actx) {
      try {
        const micSrc  = actx.createMediaStreamSource(stream)
        const analyser = actx.createAnalyser()
        analyser.fftSize = 256
        micSrc.connect(analyser)
        analyserRef.current = analyser
      } catch { /* skip analyser on unsupported browsers */ }
    }

    const mimeType = getSupportedMimeType()
    let recorder: MediaRecorder
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
    } catch {
      // Fallback: let browser choose
      try { recorder = new MediaRecorder(stream) }
      catch {
        setErrorMsg("متصفحك لا يدعم تسجيل الصوت")
        stream.getTracks().forEach((t) => t.stop())
        return
      }
    }

    audioChunksRef.current = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      streamRef.current   = null
      analyserRef.current = null
      processAudio()
    }
    mediaRecorderRef.current = recorder
    recorder.start(100)
    setIsRecording(true)
    setOrbState("listening")
    orbStateRef.current = "listening"
  }, [getAudioCtx, processAudio, isSupported])

  // Stop recording
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (sessionStartRef.current !== null) {
      const elapsedMinutes = (Date.now() - sessionStartRef.current) / 60000
      sessionStartRef.current = null
      incrementVoiceUsage(elapsedMinutes)
        .then(() =>
          fetchUsage().then((usage) => {
            const plan  = getUserPlan()
            const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS].voiceMinutesPerDay
            setVoiceStats({ used: usage.voice_minutes, limit })
          })
        )
        .catch(() => {})
    }
  }, [])

  const stateLabel =
    orbState === "listening" ? "اتكلم دلوقتي..."
    : orbState === "thinking" ? "ميليجي بيفكر..."
    : orbState === "speaking" ? "ميليجي بيتكلم..."
    : "اضغط للبدء"

  const labelColor =
    orbState === "listening" ? "#00e5c8"
    : orbState === "thinking" ? "#c084fc"
    : orbState === "speaking" ? "#60c8ff"
    : "#475569"

  return (
    <main
      className="h-[100dvh] w-full bg-black flex flex-col overflow-hidden"
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
      dir="rtl"
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-5 shrink-0">
        <button
          onClick={() => { stopAllAudio(); router.back() }}
          className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-sm"
        >
          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">رجوع</span>
        </button>
        <span className="text-white/20 text-[10px] sm:text-xs tracking-widest">MELEGY VOICE</span>
        {voiceStats && (
          <span className="text-[10px] sm:text-xs text-white/30">
            {voiceStats.limit === -1
              ? "غير محدود"
              : `${Math.floor(voiceStats.used)}/${voiceStats.limit} د`}
          </span>
        )}
      </div>

      {/* Orb + labels */}
      <div className="flex flex-col items-center justify-center flex-1 gap-3 sm:gap-5 px-4 min-h-0">
        <OrbCanvas orbStateRef={orbStateRef} analyserRef={analyserRef} />

        <p
          className="text-sm sm:text-base font-medium tracking-wide transition-colors duration-500"
          style={{ color: labelColor }}
        >
          {stateLabel}
        </p>

        {transcript && (
          <div className="w-full max-w-xs sm:max-w-sm text-center px-4">
            <span className="block text-white/25 text-[10px] sm:text-xs mb-1">قلت</span>
            <span className="text-white/55 text-xs sm:text-sm leading-relaxed line-clamp-3">{transcript}</span>
          </div>
        )}

        {reply && (
          <div className="w-full max-w-xs sm:max-w-sm text-center px-4">
            <span className="block text-cyan-400/35 text-[10px] sm:text-xs mb-1">ميليجي</span>
            <span className="text-cyan-300/75 text-xs sm:text-sm leading-relaxed line-clamp-4">{reply}</span>
          </div>
        )}

        {errorMsg && (
          <p className="text-red-400/80 text-xs sm:text-sm px-6 text-center">{errorMsg}</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-3 pb-8 sm:pb-14 shrink-0">
        {orbState === "idle" && !isRecording && (
          <button
            onClick={startListening}
            disabled={!isSupported}
            className="flex items-center gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-sm font-bold transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "rgba(0,180,210,0.10)",
              color: "#67e8f9",
              border: "1px solid rgba(0,200,220,0.30)",
            }}
          >
            <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
            ابدأ الكلام
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopListening}
            className="flex items-center gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-sm font-bold transition-all duration-200 active:scale-95"
            style={{
              background: "rgba(220,38,38,0.12)",
              color: "#fca5a5",
              border: "1px solid rgba(220,38,38,0.30)",
            }}
          >
            <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />
            اضغط لإيقاف التسجيل
          </button>
        )}
      </div>
    </main>
  )
}

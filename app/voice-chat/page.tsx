"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, MicOff, Mic } from "lucide-react"

type OrbState = "idle" | "listening" | "thinking" | "speaking"

// ─────────────────────────────────────────────────────────────────────────────
// GIF-accurate Orb — dark glass sphere + teal/purple haze + dot mesh
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
    const ctx = canvas.getContext("2d")!
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
        freqData = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(freqData)
        amp = freqData.reduce((a, b) => a + b, 0) / freqData.length / 128
      }

      const pulse =
        state === "speaking"
          ? 1 + amp * 0.10 + Math.sin(t * 0.055) * 0.018
          : state === "listening"
          ? 1 + Math.sin(t * 0.05) * 0.022
          : state === "thinking"
          ? 1 + Math.sin(t * 0.03) * 0.012
          : 1 + Math.sin(t * 0.018) * 0.008

      const baseR = W * 0.375
      const R = baseR * pulse

      ctx.clearRect(0, 0, W, H)

      // 1 – outer ambient glow
      const ambG = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.75)
      ambG.addColorStop(0, "rgba(10,40,140,0.32)")
      ambG.addColorStop(0.4, "rgba(5,20,80,0.14)")
      ambG.addColorStop(0.75, "rgba(2,8,40,0.06)")
      ambG.addColorStop(1, "rgba(0,0,0,0)")
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.75, 0, Math.PI * 2)
      ctx.fillStyle = ambG
      ctx.fill()

      // 2 – dark glass sphere body
      const sphG = ctx.createRadialGradient(
        cx - R * 0.22, cy - R * 0.22, R * 0.08,
        cx + R * 0.08, cy + R * 0.12, R * 1.06
      )
      sphG.addColorStop(0, "rgba(22,52,130,1)")
      sphG.addColorStop(0.28, "rgba(10,25,75,1)")
      sphG.addColorStop(0.55, "rgba(5,12,45,1)")
      sphG.addColorStop(0.78, "rgba(2,6,24,1)")
      sphG.addColorStop(1, "rgba(0,2,10,1)")
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = sphG
      ctx.fill()
      ctx.restore()

      // 3 – clip everything inside sphere
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.996, 0, Math.PI * 2)
      ctx.clip()

      // 3a – teal haze (bottom-center, slow drift)
      const hazeT = t * 0.007
      const tx2 = cx + Math.sin(hazeT) * R * 0.07
      const ty2 = cy + R * 0.18 + Math.cos(hazeT * 0.7) * R * 0.06
      const tG = ctx.createRadialGradient(tx2, ty2, 0, tx2, ty2, R * 0.74)
      tG.addColorStop(0, "rgba(0,210,190,0.32)")
      tG.addColorStop(0.35, "rgba(0,160,200,0.18)")
      tG.addColorStop(0.65, "rgba(0,80,160,0.08)")
      tG.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = tG
      ctx.fillRect(0, 0, W, H)

      // 3b – purple haze (bottom-right)
      const px = cx + R * 0.28 + Math.sin(hazeT * 1.2) * R * 0.05
      const py = cy + R * 0.22
      const pG = ctx.createRadialGradient(px, py, 0, px, py, R * 0.56)
      pG.addColorStop(0, "rgba(120,30,200,0.24)")
      pG.addColorStop(0.4, "rgba(80,20,160,0.12)")
      pG.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = pG
      ctx.fillRect(0, 0, W, H)

      // 3c – dot mesh texture
      const SP = 9
      const s0x = cx - R - SP
      const s0y = cy - R - SP
      const cnt = Math.ceil((R * 2 + SP * 2) / SP)
      for (let row = 0; row < cnt; row++) {
        for (let col = 0; col < cnt; col++) {
          const dx = s0x + col * SP
          const dy = s0y + row * SP
          const dist = Math.hypot(dx - cx, dy - cy)
          if (dist > R * 0.97) continue
          const edgeFade = Math.pow(1 - dist / R, 0.6)
          const glowFade = Math.max(0, 1 - dist / (R * 0.50))
          const alpha = edgeFade * (0.10 + glowFade * 0.62)
          ctx.beginPath()
          ctx.arc(dx, dy, 1.0, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${Math.round(20 + glowFade * 10)},${Math.round(170 + glowFade * 80)},${Math.round(215 + glowFade * 30)},${alpha.toFixed(2)})`
          ctx.fill()
        }
      }

      // 3d – central pill glow (bright IK-zone from GIF)
      const coreAnim =
        state === "speaking" ? 1 + amp * 0.42 + Math.sin(t * 0.09) * 0.06
        : state === "listening" ? 1 + Math.sin(t * 0.07) * 0.14
        : state === "thinking" ? 0.85 + Math.sin(t * 0.04) * 0.09
        : 0.72 + Math.sin(t * 0.025) * 0.06

      const cW = R * 0.48 * coreAnim
      const cH = R * 0.22 * coreAnim
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(1, cH / cW)
      const cG = ctx.createRadialGradient(0, 0, 0, 0, 0, cW)
      if (state === "speaking") {
        const b2 = 0.88 + amp * 0.12
        cG.addColorStop(0, `rgba(${Math.round(210 * b2)},${Math.round(245 * b2)},255,1)`)
        cG.addColorStop(0.20, `rgba(80,210,255,${(0.90 * b2).toFixed(2)})`)
        cG.addColorStop(0.50, `rgba(0,170,230,${(0.55 * b2).toFixed(2)})`)
        cG.addColorStop(0.78, `rgba(40,30,200,${(0.18 * b2).toFixed(2)})`)
        cG.addColorStop(1, "rgba(0,0,0,0)")
      } else if (state === "listening") {
        cG.addColorStop(0, "rgba(200,248,255,0.98)")
        cG.addColorStop(0.28, "rgba(0,210,240,0.78)")
        cG.addColorStop(0.58, "rgba(0,130,210,0.42)")
        cG.addColorStop(1, "rgba(0,0,0,0)")
      } else if (state === "thinking") {
        cG.addColorStop(0, "rgba(210,170,255,0.92)")
        cG.addColorStop(0.35, "rgba(150,60,255,0.55)")
        cG.addColorStop(0.70, "rgba(80,20,180,0.20)")
        cG.addColorStop(1, "rgba(0,0,0,0)")
      } else {
        cG.addColorStop(0, "rgba(140,210,255,0.70)")
        cG.addColorStop(0.45, "rgba(40,110,230,0.35)")
        cG.addColorStop(1, "rgba(0,0,0,0)")
      }
      ctx.beginPath()
      ctx.arc(0, 0, cW, 0, Math.PI * 2)
      ctx.fillStyle = cG
      ctx.fill()
      ctx.restore()

      // 3e – speaking frequency bars
      if (state === "speaking" && freqData) {
        const BARS = 36
        for (let i = 0; i < BARS; i++) {
          const angle = (i / BARS) * Math.PI * 2 - Math.PI / 2
          const v = freqData[Math.floor(i * (freqData.length / BARS))] / 255
          const bH = v * R * 0.20 + R * 0.015
          const iR = R * 0.46
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(angle) * iR, cy + Math.sin(angle) * iR)
          ctx.lineTo(cx + Math.cos(angle) * (iR + bH), cy + Math.sin(angle) * (iR + bH))
          ctx.strokeStyle = `rgba(90,215,255,${(0.28 + v * 0.65).toFixed(2)})`
          ctx.lineWidth = 1.8
          ctx.lineCap = "round"
          ctx.stroke()
        }
      }

      ctx.restore() // end clip

      // 4 – rim light
      const rimG = ctx.createRadialGradient(cx, cy, R * 0.82, cx, cy, R * 1.05)
      rimG.addColorStop(0, "rgba(0,0,0,0)")
      rimG.addColorStop(0.55, "rgba(0,150,180,0.07)")
      rimG.addColorStop(0.80, "rgba(15,90,170,0.22)")
      rimG.addColorStop(0.94, "rgba(0,160,190,0.10)")
      rimG.addColorStop(1, "rgba(0,0,0,0)")
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2)
      ctx.fillStyle = rimG
      ctx.fill()

      // 5 – glass specular top-left
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.clip()
      const glG = ctx.createRadialGradient(
        cx - R * 0.40, cy - R * 0.44, 0,
        cx - R * 0.18, cy - R * 0.22, R * 0.54
      )
      glG.addColorStop(0, "rgba(255,255,255,0.15)")
      glG.addColorStop(0.5, "rgba(210,235,255,0.05)")
      glG.addColorStop(1, "rgba(255,255,255,0)")
      ctx.fillStyle = glG
      ctx.fillRect(0, 0, W, H)
      ctx.restore()

      // 6 – listening pulse rings
      if (state === "listening") {
        for (let k = 0; k < 3; k++) {
          const phase = (((t * 0.032) - k * 0.75 + 10) % 1 + 1) % 1
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
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      alive = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [orbStateRef, analyserRef])

  return (
    <canvas
      ref={canvasRef}
      width={420}
      height={420}
      style={{ width: 420, height: 420 }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Voice Chat Page
// ─────────────────────────────────────────────────────────────────────────────
export default function VoiceChatPage() {
  const router = useRouter()
  const [orbState, setOrbState] = useState<OrbState>("idle")
  const [transcript, setTranscript] = useState("")
  const [reply, setReply] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [history, setHistory] = useState<{ role: string; content: string }[]>([])

  const orbStateRef = useRef<OrbState>("idle")
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    orbStateRef.current = orbState
  }, [orbState])

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
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    analyserRef.current = null
  }, [])

  useEffect(() => {
    return () => stopAllAudio()
  }, [stopAllAudio])

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speakReply = useCallback(async (text: string, currentHistory: { role: string; content: string }[]) => {
    setOrbState("speaking")
    try {
      const ttsRes = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!ttsRes.ok) throw new Error("TTS request failed")
      const arrayBuffer = await ttsRes.arrayBuffer()
      if (!arrayBuffer.byteLength) throw new Error("Empty audio")

      const url = URL.createObjectURL(new Blob([arrayBuffer], { type: "audio/mpeg" }))
      const audio = new Audio(url)
      audio.volume = 1.0
      audioRef.current = audio

      // Boost volume via GainNode after canplay
      audio.addEventListener("canplay", () => {
        try {
          if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
            audioCtxRef.current = new AudioContext()
          }
          const actx = audioCtxRef.current
          const src = actx.createMediaElementSource(audio)
          const analyser = actx.createAnalyser()
          analyser.fftSize = 256
          const gain = actx.createGain()
          gain.gain.value = 2.2
          src.connect(analyser)
          analyser.connect(gain)
          gain.connect(actx.destination)
          analyserRef.current = analyser
        } catch {
          // play without analyser if context fails
        }
      }, { once: true })

      audio.onended = () => {
        URL.revokeObjectURL(url)
        analyserRef.current = null
        setOrbState("idle")
      }
      audio.onerror = () => {
        setErrorMsg("خطأ في تشغيل الصوت")
        setOrbState("idle")
      }

      await audio.play()
    } catch (e: any) {
      setErrorMsg(`فشل تشغيل الصوت: ${e.message}`)
      setOrbState("idle")
    }
  }, [])

  // ── Process audio after recording stops ──────────────────────────────────
  const processAudio = useCallback(async (currentHistory: { role: string; content: string }[]) => {
    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
    if (blob.size < 600) {
      setErrorMsg("لم يُكتشف صوت — تكلم بوضوح ثم اضغط للإيقاف")
      setOrbState("idle")
      return
    }

    setOrbState("thinking")

    // STT
    const form = new FormData()
    form.append("audio", blob, "audio.webm")
    let sttText = ""
    try {
      const res = await fetch("/api/voice/stt", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok || !data.text) throw new Error(data.error || "فشل التعرف على الصوت")
      sttText = data.text.trim()
      setTranscript(sttText)
    } catch (e: any) {
      setErrorMsg(e.message)
      setOrbState("idle")
      return
    }

    // LLM
    let replyText = ""
    try {
      const res = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sttText, history: currentHistory.slice(-6) }),
      })
      const data = await res.json()
      if (!res.ok || !data.reply) throw new Error(data.error || "فشل الرد")
      replyText = data.reply.trim()
      setReply(replyText)
      const newHistory = [
        ...currentHistory,
        { role: "user", content: sttText },
        { role: "assistant", content: replyText },
      ]
      setHistory(newHistory)
      await speakReply(replyText, newHistory)
    } catch (e: any) {
      setErrorMsg(e.message)
      setOrbState("idle")
    }
  }, [speakReply])

  // ── Start recording ───────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    setErrorMsg("")
    setTranscript("")
    setReply("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Mic analyser for orb visualisation (no playback)
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext()
      }
      const actx = audioCtxRef.current
      const micSrc = actx.createMediaStreamSource(stream)
      const analyser = actx.createAnalyser()
      analyser.fftSize = 256
      micSrc.connect(analyser)
      analyserRef.current = analyser

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm"
      const recorder = new MediaRecorder(stream, { mimeType })
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        analyserRef.current = null
        processAudio(history)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      setOrbState("listening")
    } catch {
      setErrorMsg("لازم تسمح بالوصول للميكروفون")
    }
  }, [history, processAudio])

  // ── Stop recording ────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
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
      className="min-h-screen bg-black flex flex-col items-center justify-between"
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
      dir="rtl"
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between px-6 py-5">
        <button
          onClick={() => { stopAllAudio(); router.back() }}
          className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-sm"
        >
          <ArrowRight className="h-5 w-5" />
          <span>رجوع</span>
        </button>
        <span className="text-white/20 text-xs tracking-widest">MELEGY VOICE</span>
        <div className="w-16" />
      </div>

      {/* Orb */}
      <div className="flex flex-col items-center flex-1 justify-center gap-5">
        <OrbCanvas orbStateRef={orbStateRef} analyserRef={analyserRef} />

        <p className="text-base font-medium tracking-wide transition-colors duration-500"
          style={{ color: labelColor }}>
          {stateLabel}
        </p>

        {transcript && (
          <div className="max-w-xs text-center px-4">
            <span className="block text-white/25 text-xs mb-1">قلت</span>
            <span className="text-white/55 text-sm leading-relaxed">{transcript}</span>
          </div>
        )}

        {reply && (
          <div className="max-w-xs text-center px-4">
            <span className="block text-cyan-400/35 text-xs mb-1">ميليجي</span>
            <span className="text-cyan-300/75 text-sm leading-relaxed">{reply}</span>
          </div>
        )}

        {errorMsg && (
          <p className="text-red-400/80 text-sm px-6 text-center">{errorMsg}</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-3 pb-14">
        {orbState === "idle" && (
          <button
            onClick={startListening}
            className="flex items-center gap-3 px-8 py-4 rounded-full text-sm font-bold transition-all duration-200 active:scale-95"
            style={{
              background: "rgba(0,180,210,0.10)",
              color: "#67e8f9",
              border: "1px solid rgba(0,200,220,0.30)",
            }}
          >
            <Mic className="h-5 w-5" />
            ابدأ الكلام
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopListening}
            className="flex items-center gap-3 px-8 py-4 rounded-full text-sm font-bold transition-all duration-200 active:scale-95"
            style={{
              background: "rgba(220,38,38,0.12)",
              color: "#fca5a5",
              border: "1px solid rgba(220,38,38,0.30)",
            }}
          >
            <MicOff className="h-5 w-5" />
            اضغط لإيقاف التسجيل
          </button>
        )}
      </div>
    </main>
  )
}

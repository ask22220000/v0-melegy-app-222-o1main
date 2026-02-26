const API_KEY = process.env.ELEVENLABS_API
const VOICE_ID = "VxSsN5NGusWQZXue7VE9"

if (!API_KEY) {
  console.error("[tts] ELEVENLABS_API not set")
  process.exit(1)
}

console.log("[tts] API key exists, length:", API_KEY.length)
console.log("[tts] Testing voice ID:", VOICE_ID)

// First check if voice exists in account
async function checkVoice() {
  const res = await fetch(`https://api.elevenlabs.io/v1/voices/${VOICE_ID}`, {
    headers: { "xi-api-key": API_KEY },
  })
  const data = await res.json()
  console.log("[tts] Voice check status:", res.status)
  if (res.ok) {
    console.log("[tts] Voice name:", data.name)
    console.log("[tts] Voice category:", data.category)
  } else {
    console.log("[tts] Voice error:", JSON.stringify(data))
  }
  return res.ok
}

// Test TTS with voice
async function testTTS() {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": API_KEY,
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text: "مرحباً، أنا ميلجي",
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  })

  console.log("[tts] TTS status:", res.status)
  console.log("[tts] Content-Type:", res.headers.get("content-type"))

  if (!res.ok) {
    const err = await res.text()
    console.log("[tts] TTS error:", err)
  } else {
    const buf = await res.arrayBuffer()
    console.log("[tts] Audio bytes received:", buf.byteLength)
    console.log("[tts] TTS SUCCESS!")
  }
}

async function main() {
  const voiceOk = await checkVoice()
  if (voiceOk) {
    await testTTS()
  } else {
    console.log("[tts] Voice not in account - trying to add from library...")
    // Add voice from library
    const addRes = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY,
      },
      body: JSON.stringify({ public_user_id: VOICE_ID }),
    })
    console.log("[tts] Add voice status:", addRes.status)
    const addData = await addRes.json()
    console.log("[tts] Add voice response:", JSON.stringify(addData))
  }
}

main().catch(e => console.error("[tts] Fatal:", e.message))

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { text, speed } = await request.json()

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API
    // Hammam - Egyptian Arabic voice
    const VOICE_ID = "VxSsN5NGusWQZXue7VE9"

    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ElevenLabs API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Truncate text to max 5000 chars (ElevenLabs limit)
    const cleanText = text.replace(/[*_~`#]/g, "").trim().slice(0, 5000)

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_flash_v2_5",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.80,
            style: 0.10,
            use_speaker_boost: true,
            speed: typeof speed === "number" ? speed : 1.2,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] ElevenLabs error:", response.status, errorText)
      return new Response(
        JSON.stringify({ error: `ElevenLabs error ${response.status}: ${errorText}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      )
    }

    const audioBuffer = await response.arrayBuffer()

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "no-cache",
      },
    })
  } catch (error: any) {
    console.error("[v0] TTS route error:", error.message)
    return new Response(
      JSON.stringify({ error: "Failed to generate speech" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

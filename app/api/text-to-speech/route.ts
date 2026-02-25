export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API
    const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "VxSsN5NGusWQZXue7VE9"

    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "ElevenLabs API key not configured",
          fallback: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.text()
      return new Response(
        JSON.stringify({
          error: `ElevenLabs error ${response.status}: ${errorData}`,
          fallback: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const audioBuffer = await response.arrayBuffer()

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("[v0] ElevenLabs TTS error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to generate speech",
        fallback: true,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return Response.json({ error: "No audio file provided" }, { status: 400 })
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY
    if (!GROQ_API_KEY) {
      return Response.json({ error: "Groq API key not configured" }, { status: 500 })
    }

    const groqForm = new FormData()
    groqForm.append("file", audioFile, "audio.webm")
    groqForm.append("model", "whisper-large-v3-turbo")
    groqForm.append("language", "ar")
    groqForm.append("response_format", "json")

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: groqForm,
    })

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `Groq STT error: ${err}` }, { status: 502 })
    }

    const data = await res.json()
    return Response.json({ text: data.text || "" })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

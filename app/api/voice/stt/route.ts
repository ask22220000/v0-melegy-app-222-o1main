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
    groqForm.append("response_format", "verbose_json")
    groqForm.append("temperature", "0")
    // Prompt helps Whisper understand Egyptian Arabic dialect and improves spelling accuracy
    groqForm.append(
      "prompt",
      "هذا تسجيل صوتي باللهجة المصرية العامية. الكلام يحتوي على أسئلة ومحادثات يومية بالعربية. يرجى كتابة النص بدقة إملائية صحيحة."
    )

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
    // verbose_json returns full text in data.text same as json format
    const text = (data.text || "").trim()
    return Response.json({ text })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

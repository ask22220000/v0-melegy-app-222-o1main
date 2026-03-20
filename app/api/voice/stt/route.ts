// Map MIME type to the correct file extension Whisper expects
function getExtension(mimeType: string): string {
  if (mimeType.includes("mp4"))  return "mp4"
  if (mimeType.includes("ogg"))  return "ogg"
  if (mimeType.includes("wav"))  return "wav"
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3"
  return "webm" // default
}

export async function POST(request: Request) {
  try {
    const formData  = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return Response.json({ error: "No audio file provided" }, { status: 400 })
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY
    if (!GROQ_API_KEY) {
      return Response.json({ error: "Groq API key not configured" }, { status: 500 })
    }

    // Determine correct extension from the file's actual MIME type
    const mimeType = audioFile.type || "audio/webm"
    const ext      = getExtension(mimeType)
    const filename = `audio.${ext}`

    // Re-create the File with the correct name so Whisper parses it correctly
    const renamedFile = new File([await audioFile.arrayBuffer()], filename, { type: mimeType })

    const groqForm = new FormData()
    groqForm.append("file", renamedFile, filename)
    groqForm.append("model", "whisper-large-v3")          // highest accuracy for Arabic
    groqForm.append("language", "ar")
    groqForm.append("response_format", "verbose_json")
    groqForm.append("temperature", "0")                   // deterministic — most accurate
    // Priming prompt: helps Whisper recognize Egyptian/Arabic dialect and spell correctly
    groqForm.append(
      "prompt",
      "هذا تسجيل صوتي باللغة العربية أو اللهجة المصرية العامية. المحادثة تحتوي على أسئلة يومية وطلبات ومحادثات عامة. اكتب النص بدقة إملائية صحيحة باللغة العربية."
    )

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method:  "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body:    groqForm,
    })

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `Groq STT error: ${err}` }, { status: 502 })
    }

    const data = await res.json()
    const text = (data.text || "").trim()

    if (!text) {
      return Response.json({ error: "لم يتم التعرف على أي كلام" }, { status: 422 })
    }

    return Response.json({ text })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export const runtime = "nodejs"

// قائمة تصحيح إملائي شائعة للعامية المصرية بعد الـ STT
const EGYPTIAN_SPELLING_FIXES: [RegExp, string][] = [
  // أخطاء شائعة في التعرف على الصوت
  [/\bازيك\b/g, "إزيك"],
  [/\bايه\b/g, "إيه"],
  [/\bاه\b/g, "آه"],
  [/\bانا\b/g, "أنا"],
  [/\bانت\b/g, "إنت"],
  [/\bاحنا\b/g, "إحنا"],
  [/\bاكيد\b/g, "أكيد"],
  [/\bامتى\b/g, "إمتى"],
  [/\bاعمل\b/g, "أعمل"],
  [/\bافضل\b/g, "أفضل"],
  [/\bاروح\b/g, "أروح"],
  [/\bاقول\b/g, "أقول"],
  [/\bاكل\b/g, "أكل"],
  [/\bاشتغل\b/g, "اشتغل"],
  [/\bاشوف\b/g, "أشوف"],
  [/\bاجيب\b/g, "أجيب"],
  [/\bالاول\b/g, "الأول"],
  [/\bالاخر\b/g, "الأخر"],
  [/\bاللى\b/g, "اللي"],
  [/\bالى\b/g, "إلى"],
  [/\bعلى\s+طول\b/g, "على طول"],
  [/\bمش\s+عارف\b/g, "مش عارف"],
  [/\bمش\s+كده\b/g, "مش كده"],
  [/\bطب\b/g, "طب"],
  [/\bيا\s+عم\b/g, "يا عم"],
  // أخطاء إملائية شائعة لـ Whisper
  [/\bدلوقت\b/g, "دلوقتي"],
  [/\bكمان\b/g, "كمان"],
  [/\bبرضه\b/g, "برضو"],
  [/\bعشان\s+ايه\b/g, "عشان إيه"],
  [/\bمعلش\b/g, "معلش"],
  [/\bيعنى\b/g, "يعني"],
]

function fixEgyptianSpelling(text: string): string {
  let fixed = text
  for (const [pattern, replacement] of EGYPTIAN_SPELLING_FIXES) {
    fixed = fixed.replace(pattern, replacement)
  }
  return fixed
}

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

    // تحديد الامتداد الصحيح من اسم الملف
    const fileName = audioFile.name || "audio.webm"
    const ext = fileName.endsWith(".mp4") ? "mp4" : "webm"

    const groqForm = new FormData()
    groqForm.append("file", audioFile, `audio.${ext}`)
    groqForm.append("model", "whisper-large-v3-turbo")
    groqForm.append("language", "ar")
    groqForm.append("response_format", "verbose_json")
    groqForm.append("temperature", "0")
    // Whisper prompt optimized for Egyptian Arabic — improves accuracy drastically
    groqForm.append(
      "prompt",
      "محادثة يومية بالعامية المصرية الشعبية. إملاء صحيح للكلمات: إيه، إزيك، عامل إيه، تمام، ماشي، جامد، عشان، بتاع، مش، لأ، آه، دلوقتي، قبل كده، بعدين، إمتى، فين، مين، إزاي، ليه، ده، دي، دول، هو، هي، هما، أنا، إنت، إحنا، ياسلام، يعني، خالص، كمان، برضو، بقى، معلش، أكيد، أفضل، أروح، أقول، اللي، على طول، طب، يا عم، ولا إيه. تعبيرات شائعة: عارف إيه، قولي إيه، حصل إيه، محتاج إيه، عايز إيه. الكلام عن الحياة اليومية والأسئلة العامة. اكتب النص كما نُطق بالعامية المصرية مع مراعاة الإملاء الصحيح."
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
    const rawText = (data.text || "").trim()

    // تصحيح الإملاء الشائع بعد الـ transcription
    const text = fixEgyptianSpelling(rawText)

    return Response.json({ text })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف"
    return Response.json({ error: msg }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import Groq from "groq-sdk"

function getGroqClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY || "" })
}

async function translateToEnglish(prompt: string): Promise<string> {
  const groq = getGroqClient()
  const hasArabic = /[\u0600-\u06FF]/.test(prompt)
  if (!hasArabic) return prompt
  try {
    const res = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a professional translator. Translate the following Arabic text (including Egyptian dialect) to English. Return ONLY the English translation — no explanations, no extra text.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 300,
    })
    return res.choices[0]?.message?.content?.trim() || prompt
  } catch {
    return prompt
  }
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const englishPrompt = await translateToEnglish(prompt)
    const finalPrompt = `${englishPrompt}, cinematic, smooth motion, high quality animation`

    const videoUrl = `https://video.pollinations.ai/${encodeURIComponent(finalPrompt)}.mp4?width=1280&height=720&fps=24&duration=10`

    return NextResponse.json({ videoUrl })
  } catch (error: any) {
    console.error("[v0] Video generation error:", error)
    return NextResponse.json({ error: `فشل في توليد الفيديو: ${error.message}` }, { status: 500 })
  }
}

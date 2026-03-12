import { NextResponse } from "next/server"

async function translateToEnglish(arabicText: string): Promise<string> {
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(arabicText)}`,
    )
    if (!response.ok) return arabicText
    const data = await response.json()
    return data?.[0]?.[0]?.[0] || arabicText
  } catch {
    return arabicText
  }
}

async function generateVideo(translatedPrompt: string): Promise<string> {
  const cleanPrompt = translatedPrompt
    .replace(/[*#[\]{}()]/g, "")
    .replace(/\s+/g, " ")
    .trim()

  const seed = Math.floor(Math.random() * 999999)
  const encodedPrompt = encodeURIComponent(cleanPrompt)
  return `https://video.pollinations.ai/prompt/${encodedPrompt}?model=seedance-pro&seed=${seed}&duration=10`
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const englishPrompt = await translateToEnglish(prompt)
    const videoUrl = await generateVideo(englishPrompt)

    return NextResponse.json({ videoUrl })
  } catch (error: any) {
    console.error("[v0] Video error:", error?.message || error)
    return NextResponse.json({ error: "Failed to generate video" }, { status: 500 })
  }
}

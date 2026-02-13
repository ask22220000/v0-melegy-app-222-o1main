import { NextResponse } from "next/server"

async function translateToEnglish(arabicText: string): Promise<string> {
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/element.js?cb=googleTranslateElementInit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(arabicText)}`,
      },
    )

    if (!response.ok) {
      return arabicText
    }

    const text = await response.text()
    const jsonMatch = text.match(/\[\[\["wrb\.fr","MkEWBc","[\s\S]*?",null,null,null,"generic"\]\]\]/)

    if (!jsonMatch) {
      return arabicText
    }

    const translation = jsonMatch[0]
      .match(/"([^"]*)"/)?.[1]
      ?.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      ?.trim() || ""

    return translation || arabicText
  } catch (error) {
    console.error("[v0] Translation error:", error)
    return arabicText
  }
}

async function generateVideo(translatedPrompt: string): Promise<string> {
  console.log("[v0] Generating video with seedance-pro...")

  const cleanPrompt = translatedPrompt
    .replace(/[*#[\]{}()]/g, "")
    .replace(/\s+/g, " ")
    .trim()

  const seed = Math.floor(Math.random() * 999999)
  const encodedPrompt = encodeURIComponent(cleanPrompt)

  // Using Pollinations API with seedance-pro model for video generation
  const videoUrl = `https://video.pollinations.ai/prompt/${encodedPrompt}?model=seedance-pro&seed=${seed}`

  console.log("[v0] Video URL:", videoUrl)
  return videoUrl
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    console.log("[v0] Video request:", prompt)

    // Step 1: Translate to English
    const englishPrompt = await translateToEnglish(prompt)
    console.log("[v0] English prompt:", englishPrompt)

    // Step 2: Generate video
    const videoUrl = await generateVideo(englishPrompt)

    return NextResponse.json({ videoUrl })
  } catch (error: any) {
    console.error("[v0] Video error:", error?.message || error)
    return NextResponse.json({ error: "Failed to generate video" }, { status: 500 })
  }
}

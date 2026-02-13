import { NextResponse } from "next/server"

function enhanceArabicPrompt(prompt: string): string {
  const arabicToEnglish: Record<string, string> = {
    "الفن القبطي": "Coptic art style, traditional Egyptian Christian iconography, gold leaf details",
    العدرا: "Virgin Mary, Saint Mary, blessed mother Mary, religious icon",
    العذراء: "Virgin Mary, Saint Mary, holy Madonna",
    فرعوني: "ancient Egyptian pharaonic style, hieroglyphics, golden details",
    الأهرامات: "Great Pyramids of Giza, ancient Egyptian monuments",
    واقعي: "photorealistic, ultra realistic, lifelike",
    كرتون: "cartoon style, animated art",
    طبيعة: "natural landscape, nature scenery",
    جبال: "mountains, mountain range",
    بحر: "sea, ocean, water",
    جميل: "beautiful, aesthetic",
  }

  let enhancedPrompt = prompt.toLowerCase()

  for (const [arabic, english] of Object.entries(arabicToEnglish)) {
    const regex = new RegExp(arabic, "gi")
    enhancedPrompt = enhancedPrompt.replace(regex, english)
  }

  const fillerWords = ["عاوز", "عايز", "اعمللي", "اعملي", "فيديو", "باسلوب", "لـ", "ل", "في"]
  fillerWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi")
    enhancedPrompt = enhancedPrompt.replace(regex, "")
  })

  enhancedPrompt = enhancedPrompt.replace(/\s+/g, " ").trim()
  return enhancedPrompt + ", cinematic, smooth motion, high quality animation"
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const enhancedPrompt = enhanceArabicPrompt(prompt)

    console.log("[v0] Generating video with pollinations.ai...")

    const videoUrl = `https://video.pollinations.ai/${encodeURIComponent(
      enhancedPrompt,
    )}.mp4?width=1280&height=720&fps=24&duration=3`

    console.log("[v0] Successfully generated video URL")
    return NextResponse.json({ videoUrl })
  } catch (error: any) {
    console.error("[v0] Video generation error:", error)
    return NextResponse.json({ error: `فشل في توليد الفيديو: ${error.message}` }, { status: 500 })
  }
}

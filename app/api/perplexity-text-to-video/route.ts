import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getDailyUsage, getEffectivePlan, todayEgypt } from "@/lib/db"
import { PLAN_LIMITS } from "@/lib/usage-tracker"

const FREE_VIDEO_LIMIT = PLAN_LIMITS.free.animatedVideosPerDay

async function checkVideoLimit(ip: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const plan = await getEffectivePlan(ip)
    if (plan !== "free") return { allowed: true }
    const usage = await getDailyUsage(ip, todayEgypt())
    if (usage.animated_videos >= FREE_VIDEO_LIMIT) {
      return {
        allowed: false,
        reason: `لقد وصلت للحد الأقصى (${FREE_VIDEO_LIMIT} فيديو/يوم) في الخطة المجانية. قم بالترقية للمزيد!`,
      }
    }
    return { allowed: true }
  } catch {
    return { allowed: true }
  }
}

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
    const headersList = await headers()
    const ip =
      (headersList.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      headersList.get("x-real-ip") ||
      "unknown"

    const limitCheck = await checkVideoLimit(ip)
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 429 })
    }

    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const enhancedPrompt = enhanceArabicPrompt(prompt)

    const videoUrl = `https://video.pollinations.ai/${encodeURIComponent(enhancedPrompt)}.mp4?width=1280&height=720&fps=24&duration=3`

    return NextResponse.json({ videoUrl })
  } catch (error: any) {
    console.error("[v0] Video generation error:", error)
    return NextResponse.json({ error: `فشل في توليد الفيديو: ${error.message}` }, { status: 500 })
  }
}

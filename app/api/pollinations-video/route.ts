import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { PLAN_LIMITS } from "@/lib/usage-tracker"

const FREE_VIDEO_LIMIT = PLAN_LIMITS.free.animatedVideosPerDay

function todayDate() {
  return new Date().toISOString().split("T")[0]
}

async function checkVideoLimit(ip: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data } = await supabase
      .from("user_usage")
      .select("animated_videos, plan")
      .eq("user_ip", ip)
      .eq("usage_date", todayDate())
      .maybeSingle()

    const plan: string = data?.plan ?? "free"
    if (plan !== "free") return { allowed: true }

    const used: number = data?.animated_videos ?? 0
    if (used >= FREE_VIDEO_LIMIT) {
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
  return `https://video.pollinations.ai/prompt/${encodedPrompt}?model=seedance-pro&seed=${seed}`
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

    const englishPrompt = await translateToEnglish(prompt)
    const videoUrl = await generateVideo(englishPrompt)

    return NextResponse.json({ videoUrl })
  } catch (error: any) {
    console.error("[v0] Video error:", error?.message || error)
    return NextResponse.json({ error: "Failed to generate video" }, { status: 500 })
  }
}

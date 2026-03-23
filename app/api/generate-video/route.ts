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

export async function POST(req: Request) {
  try {
    const headersList = await headers()
    const ip =
      (headersList.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      headersList.get("x-real-ip") ||
      "unknown"

    const limitCheck = await checkVideoLimit(ip)
    if (!limitCheck.allowed) {
      return new Response(JSON.stringify({ error: limitCheck.reason }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { prompt } = await req.json()

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Build video URL with proper query parameters
    const params = new URLSearchParams({
      model: "veo", // Video model
      duration: "5", // 5 seconds default
      aspect_ratio: "16:9", // Widescreen format
      private: "true", // Don't add to public feed
      enhance: "true", // Enhance the prompt
      nofeed: "true",
    })

    // Encode the prompt properly
    const encodedPrompt = encodeURIComponent(prompt)

    // Pollinations video generation endpoint
    const videoUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`

    console.log("[v0] Video URL generated:", videoUrl)

    return new Response(
      JSON.stringify({
        url: videoUrl,
        prompt: prompt,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("[v0] Video generation error:", error)

    return new Response(
      JSON.stringify({
        error: "فشل توليد الفيديو",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

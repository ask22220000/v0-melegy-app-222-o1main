import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { falRun } from "@/lib/fal-config"
import { put } from "@vercel/blob"
import Groq from "groq-sdk"
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

export const maxDuration = 300

// fal is configured in lib/fal-config.ts

// Lazy — avoids top-level instantiation during build
function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

async function translateToEnglish(prompt: string): Promise<string> {
  const hasArabic = /[\u0600-\u06FF]/.test(prompt)
  if (!hasArabic) return prompt
  try {
    const res = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a professional translator. Translate the following Arabic text (including Egyptian dialect) to English. Return ONLY the English translation — no explanations, no extra text.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 200,
    })
    return res.choices[0]?.message?.content?.trim() || prompt
  } catch {
    return prompt
  }
}

async function ensurePublicBlobUrl(imageUrl: string): Promise<string> {
  if (imageUrl.includes("public.blob.vercel-storage.com")) return imageUrl

  if (imageUrl.startsWith("data:")) {
    const matches = imageUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/)
    if (!matches) throw new Error("Invalid data URL format")
    const contentType = matches[1]
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, "base64")
    const ext = contentType.includes("png") ? "png" : "jpg"
    const { url } = await put(`animate-src-${Date.now()}.${ext}`, buffer, {
      access: "public",
      contentType,
    })
    return url
  }

  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error(`Cannot fetch image: ${imgRes.status}`)
  const imgBuffer = await imgRes.arrayBuffer()
  const contentType = imgRes.headers.get("content-type") || "image/png"
  const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png"
  const { url } = await put(`animate-src-${Date.now()}.${ext}`, Buffer.from(imgBuffer), {
    access: "public",
    contentType,
  })
  return url
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

    const { imageUrl, prompt, generateAudio } = await req.json()

    if (!imageUrl) return NextResponse.json({ error: "imageUrl مطلوب" }, { status: 400 })
    if (!prompt) return NextResponse.json({ error: "prompt مطلوب" }, { status: 400 })

    // 1. Translate Arabic prompt to English
    const englishPrompt = await translateToEnglish(prompt)

    // 2. Ensure image is publicly accessible
    const publicImageUrl = await ensurePublicBlobUrl(imageUrl)

    // 3. Fixed prompt suffix — preserve faces/people/products identity 100%
    const FACE_PRESERVE_SUFFIX =
      "preserve exact facial features and identity of all people and products, photorealistic, consistent appearance, natural smooth cinematic motion, subtle gentle movement, no face distortion, no morphing, no warping, high fidelity"

    const NEGATIVE_PROMPT =
      "face distortion, face morphing, identity change, different person, altered appearance, deformed face, blurry face, low quality, watermark, text, duplicate, ugly, mutation, extra limbs, unrealistic motion, jerky motion"

    const finalPrompt = `${englishPrompt}, ${FACE_PRESERVE_SUFFIX}`

    // 4. Generate video via fal.ai — hailuo-02-fast image-to-video
    const result = await falRun("fal-ai/minimax/hailuo-02-fast/image-to-video", {
      image_url: publicImageUrl,
      prompt: finalPrompt,
      duration: "6",
      prompt_optimizer: true,
    }) as any

    const rawVideoUrl: string | undefined =
      result?.video?.url ?? result?.data?.video?.url ?? result?.videos?.[0]?.url

    if (!rawVideoUrl) throw new Error("No video URL returned from model")

    // 5. Fetch and save to Vercel Blob
    const vidRes = await fetch(rawVideoUrl)
    if (!vidRes.ok) throw new Error(`Cannot fetch video: ${vidRes.status}`)
    const vidBuffer = await vidRes.arrayBuffer()

    const { url: videoUrl } = await put(`melegy-video-${Date.now()}.mp4`, Buffer.from(vidBuffer), {
      access: "public",
      contentType: "video/mp4",
    })

    return NextResponse.json({ videoUrl })
  } catch (error: any) {
    console.error("[animate-image] Error:", error?.message || error)
    return NextResponse.json({ error: "فشل توليد الفيديو. حاول مرة تانية." }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { experimental_generateVideo as generateVideo } from "ai"
import { put } from "@vercel/blob"
import Groq from "groq-sdk"

// Allow up to 5 minutes for video generation
export const maxDuration = 300

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function translateToEnglish(prompt: string): Promise<string> {
  const hasArabic = /[\u0600-\u06FF]/.test(prompt)
  if (!hasArabic) return prompt
  try {
    const res = await groq.chat.completions.create({
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
  // Already a Vercel Blob URL — reuse it directly
  if (imageUrl.includes("public.blob.vercel-storage.com")) return imageUrl

  // Data URL (base64 image from file upload) — upload to Blob
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

  // External URL — fetch and re-host on Vercel Blob
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
    const { imageUrl, prompt, mode } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl مطلوب" }, { status: 400 })
    }
    if (!prompt) {
      return NextResponse.json({ error: "prompt مطلوب" }, { status: 400 })
    }

    // 1. Translate Arabic prompt to English
    const englishPrompt = await translateToEnglish(prompt)

    // 2. Ensure the image is on Vercel Blob (Wan requires a public URL)
    const publicImageUrl = await ensurePublicBlobUrl(imageUrl)

    // 3. Generate video via Vercel AI Gateway + Wan i2v
    const result = await generateVideo({
      model: "alibaba/wan-v2.6-i2v",
      prompt: {
        image: publicImageUrl,
        text: englishPrompt,
      },
      duration: 10,
      providerOptions: {
        alibaba: {
          audio: false,
          watermark: false,
        },
      },
    })

    // 4. Save generated video to Vercel Blob for permanent hosting
    const videoData = result.videos?.[0]?.uint8Array
    if (!videoData) throw new Error("No video data returned from model")

    const { url: videoUrl } = await put(`melegy-video-${Date.now()}.mp4`, videoData, {
      access: "public",
      contentType: "video/mp4",
    })

    return NextResponse.json({ videoUrl })
  } catch (error: any) {
    console.error("[animate-image] Error:", error?.message || error)
    return NextResponse.json(
      { error: "فشل توليد الفيديو. حاول مرة تانية." },
      { status: 500 },
    )
  }
}

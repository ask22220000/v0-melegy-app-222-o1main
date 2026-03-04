import { NextResponse } from "next/server"
import { experimental_generateVideo as generateVideo, createGateway } from "ai"
import { put } from "@vercel/blob"
import Groq from "groq-sdk"
import { Agent } from "undici"

// Allow up to 5 minutes for video generation
export const maxDuration = 300

// Custom gateway with extended timeouts — Wan i2v/r2v can take several minutes
const gateway = createGateway({
  fetch: (url, init) =>
    fetch(url, {
      ...init,
      dispatcher: new Agent({
        headersTimeout: 12 * 60 * 1000, // 12 min
        bodyTimeout: 12 * 60 * 1000,
      }),
    } as RequestInit),
})

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
  // Already a Vercel Blob URL — reuse it
  if (imageUrl.includes("public.blob.vercel-storage.com")) return imageUrl

  // Fetch and re-host on Vercel Blob so Wan can access it
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

    // 2. Ensure the image is on Vercel Blob (Wan requires public URLs)
    const publicImageUrl = await ensurePublicBlobUrl(imageUrl)

    // 3. Generate video via Vercel AI Gateway + Wan
    let result: Awaited<ReturnType<typeof generateVideo>>

    if (mode === "r2v") {
      // Reference-to-video: character1 refers to the uploaded image
      const finalPrompt = englishPrompt.toLowerCase().includes("character1")
        ? englishPrompt
        : `character1 ${englishPrompt}`

      result = await generateVideo({
        model: gateway.video("alibaba/wan-v2.6-r2v"),
        prompt: finalPrompt,
        duration: 10,
        resolution: "1280x720",
        providerOptions: {
          alibaba: {
            referenceUrls: [publicImageUrl],
            audio: false,
            watermark: false,
          },
        },
      })
    } else {
      // Image-to-video (default): animate the image directly
      result = await generateVideo({
        model: gateway.video("alibaba/wan-v2.6-i2v"),
        prompt: {
          image: publicImageUrl,
          text: englishPrompt,
        },
        duration: 10,
        resolution: "1280x720",
        providerOptions: {
          alibaba: {
            audio: false,
            watermark: false,
          },
        },
      })
    }

    // 4. Upload generated video to Vercel Blob for permanent storage
    const videoData = result.videos[0]?.uint8Array
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

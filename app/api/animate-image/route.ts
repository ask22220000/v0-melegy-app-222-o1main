import { NextResponse } from "next/server"
import * as fal from "@fal-ai/serverless-client"
import { put } from "@vercel/blob"
import Groq from "groq-sdk"

export const maxDuration = 120

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

    // 3. Generate video via fal.ai — fast-animatediff image-to-video
    fal.config({ credentials: process.env.FAL_KEY })

    // Fixed positive suffix: preserve faces/people identity 100%, natural cinematic motion
    const FACE_PRESERVE_SUFFIX =
      "preserve exact facial features and identity of all people, photorealistic face, consistent appearance, natural smooth cinematic motion, subtle gentle movement, realistic human movement, no face distortion, no morphing, no warping, high fidelity"

    // Fixed negative prompt: prevent any face or identity alteration
    const NEGATIVE_PROMPT =
      "face distortion, face morphing, identity change, different person, altered appearance, deformed face, blurry face, low quality, watermark, text, duplicate, ugly, mutation, extra limbs, unrealistic motion, jerky motion, fast motion, ai-looking, artificial"

    const finalPrompt = `${englishPrompt}, ${FACE_PRESERVE_SUFFIX}`

    const result = await fal.subscribe("fal-ai/fast-animatediff/image-to-video", {
      input: {
        image_url: publicImageUrl,
        prompt: finalPrompt,
        negative_prompt: NEGATIVE_PROMPT,
        video_size: { width: 512, height: 512 },
        num_frames: 16,
        num_inference_steps: 20,
        guidance_scale: 9.0,
        fps: 8,
      },
    }) as any

    const rawVideoUrl: string | undefined =
      result?.video?.url ?? result?.data?.video?.url ?? result?.videos?.[0]?.url

    if (!rawVideoUrl) throw new Error("No video URL returned from model")

    // 4. Fetch and save to Vercel Blob for permanent hosting
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
    return NextResponse.json(
      { error: "فشل توليد الفيديو. حاول مرة تانية." },
      { status: 500 },
    )
  }
}

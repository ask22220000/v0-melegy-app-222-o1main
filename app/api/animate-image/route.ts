import { NextResponse } from "next/server"
import * as fal from "@fal-ai/client"
import { put } from "@vercel/blob"
import Groq from "groq-sdk"

export const maxDuration = 300

function getGroqClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY || "" })
}

async function translateToEnglish(prompt: string): Promise<string> {
  const groq = getGroqClient()
  const hasArabic = /[\u0600-\u06FF]/.test(prompt)
  if (!hasArabic) return prompt
  try {
    const res = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a professional translator. Translate the following Arabic text (including Egyptian dialect) to English. Return ONLY the English translation — no explanations, no extra text.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 300,
    })
    return res.choices[0]?.message?.content?.trim() || prompt
  } catch {
    return prompt
  }
}

async function describeSubjectFromImage(imageUrl: string): Promise<string> {
  // Uses Groq vision to extract precise details of the person or product in the image
  const groq = getGroqClient()
  try {
    const res = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe in detail the main subject of this image (person or product). Include: exact appearance, clothing/outfit color and style, hair color and style, skin tone, face features, body proportions, product shape/color/logo/material. Be very specific and concise — max 80 words. Return ONLY the description, no intro.",
            },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 150,
    })
    return res.choices[0]?.message?.content?.trim() || ""
  } catch {
    return ""
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
    const { imageUrl, prompt, mode = "i2v" } = await req.json()

    if (!imageUrl) return NextResponse.json({ error: "imageUrl مطلوب" }, { status: 400 })
    if (!prompt) return NextResponse.json({ error: "prompt مطلوب" }, { status: 400 })

    // 1. Translate Arabic prompt to English
    const englishPrompt = await translateToEnglish(prompt)

    // 2. Ensure image is publicly accessible
    const publicImageUrl = await ensurePublicBlobUrl(imageUrl)

v0/ask22220000-3548c2c3
    // 3. Fixed prompt suffix — preserve faces/people/products identity 100%
    const FACE_PRESERVE_SUFFIX =
      "preserve exact facial features and identity of all people and products, photorealistic, consistent appearance, natural smooth cinematic motion, subtle gentle movement, no face distortion, no morphing, no warping, high fidelity"

    const NEGATIVE_PROMPT =
      "face distortion, face morphing, identity change, different person, altered appearance, deformed face, blurry face, low quality, watermark, text, duplicate, ugly, mutation, extra limbs, unrealistic motion, jerky motion"

    const finalPrompt = `${englishPrompt}, ${FACE_PRESERVE_SUFFIX}`

    // 4. Generate video via fal.ai — hailuo-02-fast image-to-video
    const result = await fal.subscribe("fal-ai/minimax/hailuo-02-fast/image-to-video", {
      input: {
        image_url: publicImageUrl,
        prompt: finalPrompt,
        duration: "6",
        prompt_optimizer: true,
      },
    }) as any

    const rawVideoUrl: string | undefined =
      result?.video?.url ?? result?.data?.video?.url ?? result?.videos?.[0]?.url
    let rawVideoUrl: string | undefined

    if (mode === "r2v") {
      // ===== مشهد جديد (مرجع) =====
      // 1. Extract precise subject details from the reference image using vision
      // 2. Build a rich prompt: user scene description + locked subject details
      // 3. Generate video using hailuo-02-fast with the enriched prompt
      const subjectDescription = await describeSubjectFromImage(publicImageUrl)

      const finalR2VPrompt = subjectDescription
        ? `${englishPrompt}. The main subject must look EXACTLY like this: ${subjectDescription}. Do NOT alter any physical detail of the subject — only the scene, background, and action change. Photorealistic, high fidelity, cinematic.`
        : `${englishPrompt}. Preserve the exact appearance, clothing, and all physical details of the subject from the reference image. Photorealistic, high fidelity, cinematic.`

      const result = await fal.subscribe("fal-ai/minimax/hailuo-02-fast/image-to-video", {
        input: {
          image_url: publicImageUrl,
          prompt: finalR2VPrompt,
          prompt_optimizer: false,
          duration: "10",
        },
      }) as any
      rawVideoUrl = result?.video?.url ?? result?.data?.video?.url ?? result?.videos?.[0]?.url
    } else {
      // ===== تحريك الصورة (i2v) =====
      // Uses image_url as the FIRST FRAME — animates the existing image.
      const FACE_PRESERVE_SUFFIX =
        "preserve exact facial features and identity, photorealistic, smooth cinematic motion, no face distortion, no morphing, high fidelity"
      const finalPrompt = `${englishPrompt}, ${FACE_PRESERVE_SUFFIX}`

      const result = await fal.subscribe("fal-ai/minimax/hailuo-02-fast/image-to-video", {
        input: {
          image_url: publicImageUrl,
          prompt: finalPrompt,
          prompt_optimizer: true,
          duration: "10",
        },
      }) as any
      rawVideoUrl = result?.video?.url ?? result?.data?.video?.url ?? result?.videos?.[0]?.url
    }
main

    if (!rawVideoUrl) throw new Error("No video URL returned from model")

    // Save to Vercel Blob
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

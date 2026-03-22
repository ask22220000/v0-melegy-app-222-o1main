import * as fal from "@fal-ai/client"
import { NextResponse } from "next/server"

function enhanceArabicPrompt(prompt: string): string {
  const arabicToEnglish: Record<string, string> = {
    حرك: "animate with smooth motion",
    حركه: "animate smoothly",
    "خلي يتحرك": "make it move naturally",
    حركة: "motion, movement, animation",
    طبيعي: "natural, smooth, realistic",
    جميل: "beautiful, aesthetic",
  }

  let enhancedPrompt = prompt.toLowerCase()

  for (const [arabic, english] of Object.entries(arabicToEnglish)) {
    const regex = new RegExp(arabic, "gi")
    enhancedPrompt = enhancedPrompt.replace(regex, english)
  }

  const fillerWords = ["عاوز", "عايز", "اعمللي", "الصورة", "دي", "لـ", "في"]
  fillerWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi")
    enhancedPrompt = enhancedPrompt.replace(regex, "")
  })

  enhancedPrompt = enhancedPrompt.replace(/\s+/g, " ").trim()
  return enhancedPrompt + ", smooth natural motion, cinematic animation"
}

export async function POST(req: Request) {
  try {
    const { imageUrl, prompt } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "FAL_KEY is not configured" }, { status: 500 })
    }
    fal.config({
      credentials: process.env.FAL_KEY,
    })

    let finalPrompt = prompt || "Animate this image naturally with smooth motion"
    const isArabic = /[\u0600-\u06FF]/.test(prompt || "")

    if (isArabic && prompt) {
      finalPrompt = enhanceArabicPrompt(prompt)
    }

    const result = await fal.subscribe("fal-ai/fast-animatediff/image-to-video", {
      input: {
        image_url: imageUrl,
        prompt: finalPrompt,
        video_size: {
          width: 512,
          height: 512,
        },
        num_frames: 8,
        num_inference_steps: 25,
        guidance_scale: 7.5,
      },
    })

    const videoUrl = result.data?.video?.url

    if (!videoUrl) {
      throw new Error("No video URL in response")
    }

    return NextResponse.json({ videoUrl })
  } catch (error) {
    console.error("[v0] fal.ai image-to-video error:", error)
    return NextResponse.json({ error: "Failed to animate image" }, { status: 500 })
  }
}

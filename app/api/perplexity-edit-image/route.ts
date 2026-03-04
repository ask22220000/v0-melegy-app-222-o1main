import * as fal from "@fal-ai/serverless-client"
import { NextResponse } from "next/server"
import { IMAGE_EDIT_QUALITY_CONSTANTS } from "@/lib/prompt-enhancer"

function enhanceArabicPrompt(prompt: string): string {
  const arabicToEnglish: Record<string, string> = {
    "الفن القبطي":
      "Coptic art style, traditional Egyptian Christian iconography, gold leaf details, religious Byzantine influence",
    "فن قبطي": "Coptic art style, traditional Egyptian Christian iconography, Byzantine style",
    العدرا: "Virgin Mary, Saint Mary, blessed mother Mary, religious icon painting, holy figure with halo",
    العذراء: "Virgin Mary, Saint Mary, blessed mother, religious Christian icon, holy Madonna",
    "مريم العذراء": "Virgin Mary, Saint Mary Mother of God, holy religious figure",
    مريم: "Virgin Mary, Saint Mary, Madonna",
    "السيد المسيح": "Jesus Christ, Son of God, religious holy icon, sacred figure",
    المسيح: "Jesus Christ, holy savior, religious figure",
    القديس: "Christian Saint, holy figure, religious icon",
    القديسة: "female Christian Saint, holy woman, religious icon",
    الأيقونة: "religious icon painting, Byzantine style art, traditional Orthodox icon",
    فرعوني: "ancient Egyptian pharaonic style, hieroglyphics, golden details, ancient Egypt royal art",
    الأهرامات: "Great Pyramids of Giza, ancient Egyptian monuments, desert landscape",
    معبد: "ancient Egyptian temple, pharaonic columns, hieroglyphic walls",
    فرعون: "Egyptian Pharaoh, royal ancient Egyptian king, golden crown",
    واقعي: "photorealistic, ultra realistic, lifelike, high detail",
    كرتون: "cartoon style, animated art, illustration",
    رسم: "artistic painting, hand drawn art",
    لوحة: "artistic painting, canvas art, fine art style",
    طبيعة: "natural landscape, nature scenery, outdoor environment",
    "منظر طبيعي": "scenic landscape, beautiful nature view",
    جبال: "mountains, mountain range, peaks",
    بحر: "sea, ocean, water, coastal scenery",
    ذهبي: "golden, gold color, metallic gold",
    جميل: "beautiful, aesthetic, visually appealing",
  }

  let enhancedPrompt = prompt.toLowerCase()

  for (const [arabic, english] of Object.entries(arabicToEnglish)) {
    const regex = new RegExp(arabic, "gi")
    enhancedPrompt = enhancedPrompt.replace(regex, english)
  }

  const fillerWords = [
    "عاوز",
    "عايز",
    "اعمللي",
    "اعملي",
    "اعمل",
    "صورة",
    "باسلوب",
    "بأسلوب",
    "لـ",
    "ل",
    "في",
    "من",
    "على",
    "خلي",
    "خليه",
  ]
  fillerWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi")
    enhancedPrompt = enhancedPrompt.replace(regex, "")
  })

  enhancedPrompt = enhancedPrompt.replace(/\s+/g, " ").trim()
  return enhancedPrompt + `, masterpiece quality, highly detailed, professional art, sharp focus. ${IMAGE_EDIT_QUALITY_CONSTANTS}`
}

export async function POST(req: Request) {
  try {
    const { imageUrl, prompt } = await req.json()

    if (!imageUrl || !prompt) {
      return NextResponse.json({ error: "Image URL and prompt are required" }, { status: 400 })
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "FAL_KEY is not configured" }, { status: 500 })
    }
    fal.config({
      credentials: process.env.FAL_KEY,
    })

    let finalPrompt = prompt
    const isArabic = /[\u0600-\u06FF]/.test(prompt)

    if (isArabic) {
      finalPrompt = enhanceArabicPrompt(prompt)
    }

    const result = await fal.subscribe("fal-ai/flux-2-flex/edit", {
      input: {
        image_url: imageUrl,
        prompt: finalPrompt,
        strength: 0.35,
        num_inference_steps: 40,
        guidance_scale: 7.5,
        num_images: 1,
        enable_safety_checker: false,
      },
    })

    const editedImageUrl = result.images?.[0]?.url

    if (!editedImageUrl) {
      console.error("[v0] fal.ai response:", JSON.stringify(result, null, 2))
      throw new Error("No edited image URL in response")
    }

    return NextResponse.json({ imageUrl: editedImageUrl })
  } catch (error) {
    console.error("[v0] fal.ai image editing error:", error)
    return NextResponse.json({ error: "Failed to edit image" }, { status: 500 })
  }
}

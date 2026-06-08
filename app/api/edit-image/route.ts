import { type NextRequest, NextResponse } from "next/server"
import { editImage } from "@/lib/openrouterImageService"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

async function translateWithOpenRouter(arabicPrompt: string): Promise<string> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Melegy App",
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3.5-8b",
        messages: [
          {
            role: "system",
            content: `You are a professional translator specializing in image editing instructions.
            Translate the following Arabic/Egyptian dialect text to English for image editing.
            - Keep it as clear editing instructions
            - Focus on what to change, add, remove, or modify
            - Be specific about colors, positions, and elements
            - Output ONLY the English translation, nothing else
            
            Common Egyptian words:
            - عدل/غير = change/modify
            - خلي = make/turn into
            - حط/ضيف = add/put
            - شيل/احذف = remove/delete
            - لون = color
            - لابس = wearing
            - واقف = standing
            - قاعد = sitting
            - جنب = next to
            - فوق = above
            - تحت = below`,
          },
          {
            role: "user",
            content: arabicPrompt,
          },
        ],
        max_tokens: 300,
      }),
    })

    if (!response.ok) {
      console.error("[v0] OpenRouter translation error:", response.status)
      return arabicPrompt
    }

    const data = await response.json()
    const translation = data.choices?.[0]?.message?.content?.trim()

    if (translation) {
      console.log("[v0] OpenRouter edit translation:", translation)
      return translation
    }

    return arabicPrompt
  } catch (error) {
    console.error("[v0] OpenRouter translation failed:", error)
    return arabicPrompt
  }
}

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const { images, prompt, width = 1024, height = 1024 } = await request.json()

    if (!images || !prompt) {
      return NextResponse.json({ error: "Images and prompt are required" }, { status: 400 })
    }

    if (!Array.isArray(images) || images.length > 5) {
      return NextResponse.json({ error: "يجب رفع بين 1 و 5 صور للتعديل" }, { status: 400 })
    }

    console.log("[v0] 1. Original edit prompt:", prompt)
    console.log("[v0] 2. Number of images to edit:", images.length)

    const translatedPrompt = await translateWithOpenRouter(prompt)
    console.log("[v0] 3. Translated edit prompt:", translatedPrompt)

    const qualitySuffix =
      "high quality, detailed, professional, 8K ultra HD, intricate details, sharp focus, masterpiece, best quality, cinematic lighting"

    const enhancedPrompt = `${translatedPrompt}, ${qualitySuffix}`
    console.log("[v0] 4. Enhanced edit prompt:", enhancedPrompt)

    // Use OpenRouter Riverflow for image editing
    const editedImageUrl = await editImage({
      prompt: enhancedPrompt,
      images: images,
      width,
      height,
    })

    console.log("[v0] 5. Image edited successfully with Riverflow:", editedImageUrl)

    return NextResponse.json({
      success: true,
      imageUrl: editedImageUrl,
    })
  } catch (error: any) {
    console.error("[v0] Image editing error:", error)
    return NextResponse.json({ error: error.message || "Failed to edit image" }, { status: 500 })
  }
}

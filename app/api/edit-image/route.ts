import { type NextRequest, NextResponse } from "next/server"
import * as fal from "@fal-ai/serverless-client"
import { IMAGE_EDIT_QUALITY_CONSTANTS } from "@/lib/prompt-enhancer"

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

async function translateWithPerplexity(arabicPrompt: string): Promise<string> {
  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar",
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
      console.error("[v0] Perplexity translation error:", response.status)
      return arabicPrompt
    }

    const data = await response.json()
    const translation = data.choices?.[0]?.message?.content?.trim()

    if (translation) {
      console.log("[v0] Perplexity edit translation:", translation)
      return translation
    }

    return arabicPrompt
  } catch (error) {
    console.error("[v0] Perplexity translation failed:", error)
    return arabicPrompt
  }
}

async function editWithPollinations(imageUrl: string, prompt: string): Promise<string> {
  try {
    console.log("[v0] Trying Pollinations fallback for editing...")

    // Pollinations supports image-to-image with the image parameter
    const encodedPrompt = encodeURIComponent(prompt.substring(0, 400))
    const encodedImageUrl = encodeURIComponent(imageUrl)

    // Use Pollinations img2img endpoint
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=flux&nologo=true&enhance=true&image=${encodedImageUrl}`

    // Verify the URL is accessible
    const response = await fetch(pollinationsUrl, { method: "HEAD", signal: AbortSignal.timeout(30000) })

    if (response.ok) {
      console.log("[v0] Pollinations edit URL generated successfully")
      return pollinationsUrl
    }

    throw new Error("Pollinations edit URL not accessible")
  } catch (error) {
    console.error("[v0] Pollinations edit fallback failed:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, prompt } = await request.json()

    if (!imageUrl || !prompt) {
      return NextResponse.json({ error: "Image URL and prompt are required" }, { status: 400 })
    }

    console.log("[v0] 1. Original edit prompt:", prompt)

    const translatedPrompt = await translateWithPerplexity(prompt)
    console.log("[v0] 2. Translated edit prompt:", translatedPrompt)

    const enhancedPrompt = `${translatedPrompt}. ${IMAGE_EDIT_QUALITY_CONSTANTS}`
    console.log("[v0] 3. Enhanced edit prompt:", enhancedPrompt)

    let editedImageUrl: string | undefined

    try {
      fal.config({
        credentials: process.env.FAL_KEY,
      })

      console.log("[v0] 4. Editing image with fal-ai/flux-2-flex/edit...")

      const result = (await fal.subscribe("fal-ai/flux-2-flex/edit", {
        input: {
          prompt: enhancedPrompt,
          image_urls: [imageUrl],
          num_inference_steps: 45,
          guidance_scale: 8.5,
          num_images: 1,
        },
      })) as { images?: { url: string }[] }

      editedImageUrl = result.images?.[0]?.url

      if (!editedImageUrl) {
        throw new Error("No image returned from fal.ai")
      }

      console.log("[v0] 5. Image edited successfully with fal.ai:", editedImageUrl)
    } catch (falError: any) {
      console.error("[v0] fal.ai edit failed, trying Pollinations fallback:", falError.message)

      try {
        editedImageUrl = await editWithPollinations(imageUrl, enhancedPrompt)
        console.log("[v0] 5. Image edited successfully with Pollinations fallback:", editedImageUrl)
      } catch (pollinationsError) {
        console.error("[v0] Both fal.ai and Pollinations failed for editing")
        throw new Error("Image editing failed with all providers")
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl: editedImageUrl,
    })
  } catch (error: any) {
    console.error("[v0] Image editing error:", error)
    return NextResponse.json({ error: error.message || "Failed to edit image" }, { status: 500 })
  }
}

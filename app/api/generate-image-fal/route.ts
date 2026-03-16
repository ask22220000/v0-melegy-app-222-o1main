import { type NextRequest, NextResponse } from "next/server"
import * as fal from "@fal-ai/serverless-client"
import { processPromptForImageGeneration, NEGATIVE_PROMPT_CONSTANTS } from "@/lib/prompt-enhancer"

export const maxDuration = 60
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Validate and configure FAL
    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "FAL_KEY is not configured" }, { status: 500 })
    }

    fal.config({
      credentials: process.env.FAL_KEY,
    })

    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    console.log("[v0] Original prompt:", prompt)

    // Process prompt: translate + enhance
    const finalPrompt = await processPromptForImageGeneration(prompt)

    console.log("[v0] Generating image with enhanced prompt:", finalPrompt)

    // Generate image using fal-ai/flux-pro/v1.1 for better quality and anatomy
    const result = await fal.subscribe("fal-ai/flux-pro/v1.1", {
      input: {
        prompt: finalPrompt,
        negative_prompt: NEGATIVE_PROMPT_CONSTANTS,
        image_size: {
          width: 1080,
          height: 1350
        },
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        safety_tolerance: "2",
      },
    })

    // Extract the image URL from the result
    const imageUrl = (result as any).images?.[0]?.url

    if (!imageUrl) {
      console.error("[v0] No image in result:", result)
      throw new Error("No image generated")
    }

    console.log("[v0] Image generated successfully:", imageUrl)
    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error("[v0] Error generating image:", error)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
  }
}

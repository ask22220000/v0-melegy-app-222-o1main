import * as fal from "@fal-ai/serverless-client"
import { NextResponse } from "next/server"
import { processPromptForImageEditing, IMAGE_EDIT_QUALITY_CONSTANTS } from "@/lib/prompt-enhancer"

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

    const finalPrompt = await processPromptForImageEditing(prompt)

    const result = await fal.subscribe("fal-ai/flux-2-flex/edit", {
      input: {
        image_url: imageUrl,
        prompt: finalPrompt,
        strength: 0.55,
        num_inference_steps: 45,
        guidance_scale: 8.5,
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

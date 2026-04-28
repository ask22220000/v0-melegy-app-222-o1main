import { type NextRequest, NextResponse } from "next/server"
import { falRun } from "@/lib/fal-config"
import { processPromptForImageGeneration } from "@/lib/prompt-enhancer"

export const maxDuration = 60
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()
    if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 })

    const finalPrompt = await processPromptForImageGeneration(prompt)

    const data = await falRun("fal-ai/flux/schnell", {
      prompt: finalPrompt,
      image_size: { width: 1080, height: 1350 },
      num_inference_steps: 4,
      num_images: 1,
    })

    const imageUrl = data?.images?.[0]?.url
    if (!imageUrl) throw new Error("No image generated")

    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error("[API] Error generating image:", error)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
  }
}

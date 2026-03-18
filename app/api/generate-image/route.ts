import { processPromptForImageGeneration, IMAGE_GEN_QUALITY_CONSTANTS } from "@/lib/prompt-enhancer"
import * as fal from "@fal-ai/serverless-client"

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("[v0] 1. Original prompt:", prompt)

    // Process the prompt through the professional prompt engineering system
    const engineeredPrompt = await processPromptForImageGeneration(prompt)
    console.log("[v0] 2. Engineered prompt:", engineeredPrompt)

    if (!process.env.FAL_KEY) {
      return new Response(JSON.stringify({ error: "FAL_KEY is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    fal.config({
      credentials: process.env.FAL_KEY,
    })

    const result = await fal.subscribe("fal-ai/flux-2-flex", {
      input: {
        prompt: engineeredPrompt,
        num_inference_steps: 50,
        guidance_scale: 8.5,
        num_images: 1,
        enable_safety_checker: false,
      },
    })

    const generatedImageUrl = result.images?.[0]?.url

    if (!generatedImageUrl) {
      console.error("[v0] fal.ai response:", JSON.stringify(result, null, 2))
      throw new Error("No image URL in response")
    }

    console.log("[v0] 3. Generated image URL:", generatedImageUrl)

    return new Response(JSON.stringify({ imageUrl: generatedImageUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[v0] Image generation error:", error)

    return new Response(
      JSON.stringify({
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

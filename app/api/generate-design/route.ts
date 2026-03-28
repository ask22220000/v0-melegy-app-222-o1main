import { type NextRequest, NextResponse } from "next/server"
import * as fal from "@fal-ai/client"
import { processPromptForImageGeneration } from "@/lib/prompt-enhancer"

export const maxDuration = 60
export const runtime = "nodejs"

// Extract optional text overlay requested in the prompt
function extractTextFromPrompt(prompt: string): string | null {
  const patterns = [
    /مكتوب\s+(?:ع|على|علي|عل)\s+(?:الصورة|الصوره)\s+(.+?)(?:\s|$)/i,
    /(?:Text|text):\s*(.+?)(?:\n|$)/i,
    /["']([^"']+)["']/,
    /(?:اكتب|كتابة)\s+(.+?)(?:\s+على|\s+فوق|$)/i,
  ]
  for (const pattern of patterns) {
    const match = prompt.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "FAL_KEY is not configured" }, { status: 500 })
    }

    fal.config({ credentials: process.env.FAL_KEY })

    const { imagePrompt, textContent, textPosition = "center" } = await request.json()

    if (!imagePrompt) {
      return NextResponse.json({ error: "Image prompt is required" }, { status: 400 })
    }

    const extractedText = textContent || extractTextFromPrompt(imagePrompt)

    // Step 1: Use Gemini via AI Gateway as Prompt Engineer to translate + enhance
    const enhancedPrompt = await processPromptForImageGeneration(imagePrompt)

    // Step 2: Build final FAL prompt — no text overlays, high quality
    const falPrompt = `${enhancedPrompt}, professional photography, vibrant colors, highly detailed, no text overlay, no watermarks, 8k quality`

    // Step 3: Generate image via fal-ai/flux/schnell
    let result: any
    try {
      result = await fal.subscribe("fal-ai/flux/schnell", {
        input: {
          prompt: falPrompt,
          image_size: { width: 1080, height: 1350 }, // 4:5 portrait
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: false,
        },
      })
    } catch (falError: any) {
      console.error("[generate] FAL API error:", falError)
      if (falError.status === 403 && falError.body?.detail?.includes("Exhausted balance")) {
        return NextResponse.json(
          { error: "رصيد FAL انتهى. يرجى شحن الرصيد من fal.ai/dashboard/billing" },
          { status: 402 },
        )
      }
      throw falError
    }

    // fal-ai/flux/schnell returns images directly on the result object
    const imageUrl: string | undefined =
      result?.images?.[0]?.url ?? result?.data?.images?.[0]?.url

    if (!imageUrl) {
      throw new Error("FAL API did not return an image")
    }

    return NextResponse.json({
      success: true,
      design: {
        backgroundImage: imageUrl,
        textLayer: extractedText
          ? {
              content: extractedText,
              position: textPosition,
              style: {
                fontSize: "48px",
                fontWeight: "bold",
                color: "#ffffff",
                textShadow: "2px 2px 8px rgba(0,0,0,0.8)",
                fontFamily: "Cairo, sans-serif",
              },
            }
          : null,
      },
    })
  } catch (error: any) {
    console.error("[generate] Error generating design:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate design" },
      { status: 500 },
    )
  }
}

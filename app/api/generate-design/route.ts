import { type NextRequest, NextResponse } from "next/server"
import * as fal from "@fal-ai/serverless-client"
import { processPromptForImageGeneration } from "@/lib/prompt-enhancer"

export const maxDuration = 60
export const runtime = "nodejs"

// Extract text content from Arabic prompt
function extractTextFromPrompt(prompt: string): string | null {
  console.log("[v0] Extracting text from prompt:", prompt)
  
  // Match patterns like: "مكتوب X" or "اكتب X" or text in quotes
  const patterns = [
    /مكتوب\s+(?:ع|على|علي|عل)\s+(?:الصورة|الصوره|الصوره)\s+(.+?)(?:\s|$)/i,
    /(?:Text|text):\s*(.+?)(?:\n|$)/i,
    /["']([^"']+)["']/,
    /(?:اكتب|كتابة)\s+(.+?)(?:\s+على|\s+فوق|$)/i,
  ]

  for (const pattern of patterns) {
    const match = prompt.match(pattern)
    if (match && match[1]) {
      const extracted = match[1].trim()
      console.log("[v0] Text extracted:", extracted)
      return extracted
    }
  }

  console.log("[v0] No text extracted")
  return null
}



export async function POST(request: NextRequest) {
  try {
    // Validate and configure FAL
    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "FAL_KEY is not configured" }, { status: 500 })
    }

    fal.config({
      credentials: process.env.FAL_KEY,
    })

    const { imagePrompt, textContent, textPosition = "center" } = await request.json()

    if (!imagePrompt) {
      return NextResponse.json({ error: "Image prompt is required" }, { status: 400 })
    }

    // Step 1: Extract text content from prompt (if not provided)
    const extractedText = textContent || extractTextFromPrompt(imagePrompt)
    console.log("[v0] Design generation - Image:", imagePrompt, "Extracted text:", extractedText)

    // Step 2: Translate and enhance image prompt
    const enhancedPrompt = await processPromptForImageGeneration(imagePrompt)

    // Step 3: Generate high-quality background image WITHOUT any text
    const cleanPrompt = `${enhancedPrompt}, professional photography, vibrant colors, detailed scene, no text overlay, no watermarks, high quality`
    
    console.log("[v0] Generating image with FAL using prompt:", cleanPrompt)
    
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: cleanPrompt,
        image_size: "landscape_4_3",
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false,
      },
    })
    
    console.log("[v0] FAL result:", JSON.stringify(result, null, 2))

    const imageUrl = (result as any).images?.[0]?.url

    if (!imageUrl) {
      console.error("[v0] No image in result:", result)
      throw new Error("No image generated")
    }

    console.log("[v0] Clean background generated:", imageUrl)

    // Step 4: Return design data with image + text layer info
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
  } catch (error) {
    console.error("[v0] Error generating design:", error)
    return NextResponse.json({ error: "Failed to generate design" }, { status: 500 })
  }
}

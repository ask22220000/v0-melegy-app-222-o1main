import { type NextRequest, NextResponse } from "next/server"
import * as fal from "@fal-ai/serverless-client"
import { processPromptForImageEditing } from "@/lib/prompt-enhancer"

v0/ask22220000-1c05a125
export const maxDuration = 60
export const runtime = "nodejs"

// Increase body size limit for base64 images (50MB)
export const maxDuration = 60 // Maximum allowed by Vercel
main

// Configure fal client once at module level
fal.config({
  credentials: process.env.FAL_KEY,
})

export async function POST(request: NextRequest) {
  try {
    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "FAL_KEY is not configured in environment" }, { status: 500 })
    }

    const { imageUrl, imageUrls, prompt } = await request.json()

    // Support both single imageUrl and multiple imageUrls
    const finalImageUrls = imageUrls || (imageUrl ? [imageUrl] : [])

    if (!finalImageUrls || finalImageUrls.length === 0 || !prompt) {
      return NextResponse.json({ error: "Image URL(s) and prompt are required" }, { status: 400 })
    }

    if (finalImageUrls.length > 3) {
      return NextResponse.json({ error: "Maximum 3 images allowed" }, { status: 400 })
    }

    // Step 1: Validate and process image URLs
    for (let i = 0; i < finalImageUrls.length; i++) {
      const imgUrl = finalImageUrls[i]
      if (imgUrl.startsWith("data:")) {
        // Check base64 size (rough estimate: base64 is ~33% larger than binary)
        const base64Size = imgUrl.length * 0.75 / 1024 / 1024 // MB
        
        if (base64Size > 15) {
          throw new Error(`الصورة ${i + 1} كبيرة جداً (أكثر من 15 ميجا). قلل جودة الصورة أو استخدم صورة أصغر.`)
        }
      }
    }

    // Step 2: Use Gemini 3 Flash as Prompt Engineer — translate + preserve subject features
    const enhancedPrompt = await processPromptForImageEditing(prompt)

    // Step 3: Edit image via fal-ai/nano-banana/edit for fast, efficient editing
    // Using Nano Banana with optimized settings
    let result: any
    try {
v0/ask22220000-1c05a125
      result = await fal.subscribe("fal-ai/flux-lora/image-to-image", {
        input: {
          prompt: enhancedPrompt,
          image_url: finalImageUrls[0],
          num_images: 1,
          num_inference_steps: 28,
          guidance_scale: 3.5,
          strength: 0.85,
          enable_safety_checker: false,

      result = await fal.subscribe("fal-ai/nano-banana/edit", {
        input: {
          prompt: enhancedPrompt,
          image_urls: finalImageUrls,
          num_images: 1,
          output_format: "jpeg",
          safety_tolerance: "4",
          aspect_ratio: "auto",
main
        },
      })
    } catch (falError: any) {
      console.error("[edit] FAL API error:", falError)

      if (falError.status === 403) {
        throw new Error("خطأ 403: تأكد من صحة FAL_KEY أو أن النموذج متاح لحسابك")
      }
      if (falError.status === 413 || falError.message?.includes("payload too large")) {
        throw new Error("الصورة كبيرة جداً. يرجى استخدام صورة أصغر (أقل من 5 ميجا)")
      }
      if (falError.status === 504 || falError.message?.includes("timeout")) {
        throw new Error("انتهى وقت المعالجة. حاول مرة أخرى بصورة أصغر")
      }

      const errorMsg =
        falError.body?.detail?.[0]?.msg ||
        falError.body?.detail ||
        falError.message ||
        "خطأ في الخدمة"
      throw new Error(`فشل تعديل الصورة: ${errorMsg}`)
    }

    // fal JS client: images at result.images or result.data.images
    const editedImageUrl: string | undefined =
      result?.images?.[0]?.url ?? result?.data?.images?.[0]?.url

    if (!editedImageUrl) {
      throw new Error("FAL API did not return an edited image")
    }

    return NextResponse.json({ editedImageUrl, success: true })
  } catch (error: any) {
    console.error("[v0] Image editing error:", error.message)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "فشل تعديل الصورة. حاول مرة أخرى",
        errorType: error.constructor.name,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import * as fal from "@fal-ai/serverless-client"
import { processPromptForImageEditing } from "@/lib/prompt-enhancer"

// Increase body size limit for base64 images (50MB)
export const maxDuration = 60 // Maximum allowed by Vercel
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables at runtime
    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "FAL_KEY is not configured in environment" }, { status: 500 })
    }

    // Configure FAL client with current FAL_KEY (ensures fresh config per request)
    fal.config({
      credentials: process.env.FAL_KEY,
    })

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
        
        console.log(`[v0] Image ${i + 1} size: ${base64Size.toFixed(2)} MB`)
      }
    }
    
    console.log(`[v0] Processing ${finalImageUrls.length} image(s) for editing`)

    // Step 2: Translate and enhance prompt (with character and scene preservation)
    const enhancedPrompt = await processPromptForImageEditing(prompt)

    // Step 3: Edit/combine images with fal-ai/flux-2/turbo/edit (fast and precise)
    // Lower strength = more preservation of original image (0.3-0.4 preserves identity better)
    let result
    try {
      result = await fal.subscribe("fal-ai/flux-2/turbo/edit", {
        input: {
          prompt: enhancedPrompt,
          image_urls: finalImageUrls, // Pass all images for combination/editing
          strength: 0.35, // Lower strength to preserve character features and scene (0.35 = 65% original preserved)
          guidance_scale: 3.0, // Lower guidance for better preservation
          num_inference_steps: 4, // Turbo model uses fewer steps
          image_size: {
            width: 1080,
            height: 1350
          }, // 4:5 portrait format (1080x1350)
          enable_safety_checker: false,
        },
      })
    } catch (falError: any) {
      console.error("[v0] FAL API error:", falError)
      
      // Handle specific FAL errors
      if (falError.status === 403 && falError.body?.detail?.includes("Exhausted balance")) {
        throw new Error("رصيد FAL انتهى. يرجى شحن الرصيد من fal.ai/dashboard/billing")
      }
      
      if (falError.status === 413 || falError.message?.includes("payload too large")) {
        throw new Error("الصورة كبيرة جداً. يرجى استخدام صورة أصغر (أقل من 5 ميجا)")
      }
      
      if (falError.status === 504 || falError.message?.includes("timeout")) {
        throw new Error("انتهى وقت المعالجة. حاول مرة أخرى بصورة أصغر")
      }
      
      const errorMsg = falError.body?.detail || falError.body?.detail?.[0]?.msg || falError.message || "خطأ في الخدمة"
      throw new Error(`فشل تعديل الصورة: ${errorMsg}`)
    }

    // Extract the edited image URL from response (based on docs: result.data.images[0].url)
    const editedImageUrl = (result as any).data?.images?.[0]?.url || (result as any).images?.[0]?.url

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

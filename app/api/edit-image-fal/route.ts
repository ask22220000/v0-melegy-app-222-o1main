import { type NextRequest, NextResponse } from "next/server"
import * as fal from "@fal-ai/serverless-client"
import { processPromptForImageGeneration } from "@/lib/prompt-enhancer"

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

    const { imageUrls, prompt } = await request.json()

    if (!imageUrls || imageUrls.length === 0 || !prompt) {
      return NextResponse.json({ error: "Image URLs and prompt are required" }, { status: 400 })
    }

    if (imageUrls.length > 3) {
      return NextResponse.json({ error: "Maximum 3 images allowed" }, { status: 400 })
    }

    // Step 1: Validate base64 image sizes
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i]
      if (imageUrl.startsWith("data:")) {
        // Check base64 size (rough estimate: base64 is ~33% larger than binary)
        const base64Size = imageUrl.length * 0.75 / 1024 / 1024 // MB
        
        if (base64Size > 10) {
          throw new Error(`الصورة ${i + 1} كبيرة جداً (أكثر من 10 ميجا). استخدم صورة أصغر.`)
        }
      }
    }

    // Step 2: Translate and enhance prompt
    const enhancedPrompt = await processPromptForImageGeneration(prompt)

    // Step 3: Edit/combine images with fal-ai/flux-2/turbo/edit (fast and precise)
    let result
    try {
      result = await fal.subscribe("fal-ai/flux-2/turbo/edit", {
        input: {
          prompt: enhancedPrompt,
          image_urls: imageUrls, // Pass all images for combination/editing
          strength: 0.5, // Balance between preservation and editing
          guidance_scale: 3.5,
          num_inference_steps: 4, // Turbo model uses fewer steps
          image_size: "portrait_4_5", // 1080x1350 portrait output
          enable_safety_checker: false,
        },
      })
    } catch (falError: any) {
      // Handle specific FAL errors
      if (falError.status === 403 && falError.body?.detail?.includes("Exhausted balance")) {
        throw new Error("رصيد FAL انتهى. يرجى شحن الرصيد من fal.ai/dashboard/billing")
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
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "فشل تعديل الصورة",
        errorType: error.constructor.name,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

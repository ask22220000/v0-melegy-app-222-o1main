/**
 * Prompt Engineer Service
 * يحول وصف المستخدم العربي إلى برومبت احترافي باستخدام Groq
 */

export async function enhancePromptToEnglish(arabicPrompt: string): Promise<string> {
  try {
    console.log("[v0] Enhancing Arabic prompt:", arabicPrompt)

    const response = await fetch("/api/translate-groq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: arabicPrompt }),
    })

    if (!response.ok) {
      console.error("[v0] Failed to enhance prompt")
      return arabicPrompt
    }

    const data = await response.json()
    const englishPrompt = data.translation || arabicPrompt

    console.log("[v0] Enhanced prompt:", englishPrompt)
    return englishPrompt
  } catch (error) {
    console.error("[v0] Error enhancing prompt:", error)
    return arabicPrompt
  }
}

export async function generateImage(userPrompt: string): Promise<string> {
  try {
    console.log("[v0] Generating image with prompt:", userPrompt)

    // كشف اللغة تلقائياً والترجمة إذا كان عربي
    let finalPrompt = userPrompt
    let isArabic = false
    for (let i = 0; i < userPrompt.length; i++) {
      const code = userPrompt.charCodeAt(i)
      if (code >= 0x0600 && code <= 0x06ff) {
        isArabic = true
        break
      }
    }
    
    if (isArabic) {
      console.log("[v0] Detected Arabic, translating...")
      finalPrompt = await enhancePromptToEnglish(userPrompt)
    }

    console.log("[v0] Final prompt:", finalPrompt)

    const response = await fetch("/api/generate-image-fal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: finalPrompt }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("[v0] Failed to generate image:", errorData)
      throw new Error(errorData.error || "Image generation failed")
    }

    const data = await response.json()
    return data.imageUrl
  } catch (error) {
    console.error("[v0] Error generating image:", error)
    throw error
  }
}

export async function editImage(imageUrl: string | string[], editPrompt: string): Promise<string> {
  try {
    console.log("[v0] Editing image with prompt:", editPrompt)

    // Support both single imageUrl and multiple imageUrls
    // The API will handle translation and enhancement internally
    const body = Array.isArray(imageUrl) 
      ? { imageUrls: imageUrl, prompt: editPrompt }
      : { imageUrl, prompt: editPrompt }

    console.log("[v0] Sending edit request to API...")
    const response = await fetch("/api/edit-image-fal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("[v0] Failed to edit image:", errorData)
      throw new Error(errorData.error || "فشل تعديل الصورة")
    }

    const data = await response.json()
    console.log("[v0] Image edited successfully")
    return data.editedImageUrl
  } catch (error: any) {
    console.error("[v0] Error editing image:", error)
    throw new Error(error.message || "فشل تعديل الصورة")
  }
}

// Legacy exports for backward compatibility
export async function generateVideo(userPrompt: string): Promise<void> {
  console.log("[v0] Video generation has been removed. Please use image generation instead.")
}

export async function checkImageEditUsage(): Promise<void> {
  console.log("[v0] Checking image edit usage...")
}

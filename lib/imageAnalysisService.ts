export interface ImageAnalysisResult {
  success: boolean
  description?: string
  details?: string
  promptSuggestion?: string
  base64Image?: string
  detectedObjects?: Array<{ label: string; confidence: number }>
  suggestedEdits?: string[]
  error?: string
}

export async function analyzeImage(
  imageFile: File,
  userPrompt: string,
  language: "ar" | "en" = "ar",
): Promise<ImageAnalysisResult> {
  try {
    const base64Image = await fileToBase64(imageFile)

    const analysisPrompt =
      language === "ar"
        ? `قم بتحليل هذه الصورة بشكل تفصيلي. ${userPrompt || "صف ما تراه في الصورة بالتفصيل."}`
        : `Analyze this image in detail. ${userPrompt || "Describe what you see in the image in detail."}`

    // Note: Perplexity doesn't support image analysis in the same way
    // For now, we'll return a placeholder response
    // In production, you'd want to use FAL's vision model or another service
    
    console.log("[v0] Image analysis requested - using fallback")

    return {
      success: true,
      description: "تحليل الصور متاح فقط من خلال صفحات الشات المتقدمة (Chat Pro)",
      base64Image: base64Image,
    }
  } catch (error) {
    console.error("[v0] Image analysis error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze image",
    }
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

export function isImageAnalysisRequest(text: string): boolean {
  const keywords = [
    "analyze image",
    "تحليل الصورة",
    "حلل الصورة",
    "وش في الصورة",
    "describe image",
    "what is in",
    "ما في الصورة",
    "إيش في الصورة",
  ]
  return keywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()))
}

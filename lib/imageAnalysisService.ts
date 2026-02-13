import { apiKeyManager } from "./apiKeyManager"

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
    const base64Data = base64Image.split(",")[1]

    const analysisPrompt =
      language === "ar"
        ? `قم بتحليل هذه الصورة بشكل تفصيلي. ${userPrompt || "صف ما تراه في الصورة بالتفصيل."}`
        : `Analyze this image in detail. ${userPrompt || "Describe what you see in the image in detail."}`

    const apiKey = apiKeyManager.getCurrentKey()
    const requestBody = {
      contents: [
        {
          parts: [
            { text: analysisPrompt },
            {
              inline_data: {
                mime_type: imageFile.type,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    )

    if (!response.ok) {
      apiKeyManager.reportError()
      throw new Error(`Gemini Vision API error: ${response.status}`)
    }

    const data = await response.json()
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

    apiKeyManager.reportSuccess()

    return {
      success: true,
      description: analysisText,
      base64Image: base64Image,
    }
  } catch (error) {
    console.error("Image analysis error:", error)
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

import { generateText } from "ai"

// Translate Arabic to English using Gemini 3 Flash
export async function translateToEnglish(text: string): Promise<string> {
  try {
    const hasArabic = /[\u0600-\u06FF]/.test(text)
    if (!hasArabic) {
      console.log("[v0] Text is already in English, skipping translation")
      return text
    }

    console.log("[v0] Translating Arabic text to English using Gemini 3 Flash...")
    const result = await generateText({
      model: "google/gemini-3-flash",
      messages: [
        {
          role: "system",
          content: "You are a translator. Translate the Arabic text to English. Keep it natural and descriptive. Return ONLY the English translation, nothing else.",
        },
        {
          role: "user",
          content: text,
        },
      ],
      maxTokens: 200,
      temperature: 0.3,
    })

    const translated = result.text.trim()
    console.log("[v0] Translation result:", translated.substring(0, 100))
    return translated
  } catch (error) {
    console.error("[v0] Translation error:", error)
    return text
  }
}

// Enhance prompt for better AI image generation using Gemini 3 Flash
export async function enhancePromptForImageGeneration(prompt: string): Promise<string> {
  try {
    console.log("[v0] Enhancing prompt with Gemini 3 Flash...")
    const result = await generateText({
      model: "google/gemini-3-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a professional Prompt Engineer specialized in AI image generation. Enhance the given description with professional visual details and artistic direction. Keep it concise (under 100 words) and in English. Focus on: lighting, composition, style, colors, mood, and technical quality.",
        },
        {
          role: "user",
          content: `Enhance this image prompt: ${prompt}`,
        },
      ],
      maxTokens: 200,
      temperature: 0.7,
    })

    const enhanced = result.text.trim() || prompt
    console.log("[v0] Enhanced prompt:", enhanced.substring(0, 100))
    return enhanced
  } catch (error) {
    console.error("[v0] Enhancement error:", error)
    return prompt
  }
}

// Full pipeline: translate + enhance in one step using Gemini 3 Flash
export async function processPromptForImageGeneration(userPrompt: string): Promise<string> {
  console.log("[v0] Processing prompt:", userPrompt.substring(0, 50))
  
  try {
    const hasArabic = /[\u0600-\u06FF]/.test(userPrompt)
    const systemPrompt = hasArabic
      ? "You are a professional translator and AI image prompt engineer. First translate the Arabic text to English, then enhance it with professional visual details (lighting, composition, style, colors, mood). IMPORTANT: Remove any instructions to write or add text/words on the image. Focus ONLY on visual elements, not text overlays. Return ONLY the final enhanced English prompt in under 100 words."
      : "You are a professional AI image prompt engineer. Enhance the description with professional visual details (lighting, composition, style, colors, mood). IMPORTANT: Remove any instructions to write or add text/words on the image. Focus ONLY on visual elements, not text overlays. Return ONLY the enhanced prompt in under 100 words."

    console.log("[v0] Processing with Gemini 3 Flash (translate + enhance)...")
    const result = await generateText({
      model: "google/gemini-3-flash",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      maxTokens: 200,
      temperature: 0.7,
    })

    const processedPrompt = result.text.trim() || userPrompt
    console.log("[v0] Final processed prompt:", processedPrompt.substring(0, 100))
    return processedPrompt
  } catch (error) {
    console.error("[v0] Processing error:", error)
    return userPrompt
  }
}

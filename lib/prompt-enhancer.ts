import { generateText } from "ai"

// Translate Arabic to English using Gemini 3 Flash via Vercel AI Gateway
export async function translateToEnglish(text: string): Promise<string> {
  try {
    const hasArabic = /[\u0600-\u06FF]/.test(text)
    if (!hasArabic) {
      return text
    }

    const result = await generateText({
      model: "google/gemini-3-flash",
      system:
        "You are a translator. Translate the Arabic text to English. Keep it natural and descriptive. Return ONLY the English translation, nothing else.",
      prompt: text,
      maxOutputTokens: 200,
      temperature: 0.3,
    })

    return result.text.trim() || text
  } catch (error) {
    console.error("[generate] Translation error:", error)
    return text
  }
}

// Full pipeline: translate + enhance in one step using Gemini 3 Flash
// Used for image GENERATION (fal-ai/flux/schnell)
export async function processPromptForImageGeneration(userPrompt: string): Promise<string> {
  try {
    const hasArabic = /[\u0600-\u06FF]/.test(userPrompt)
    console.log("[v0] processPromptForImageGeneration - input:", userPrompt, "| hasArabic:", hasArabic)

    const systemPrompt = hasArabic
      ? "You are a professional translator and AI image prompt engineer specializing in photorealistic generation. Translate the Arabic text to English, then enhance it with rich visual details: lighting, composition, color palette, mood, camera angle, and photographic style. IMPORTANT: Do NOT include any text overlays or typography instructions. Return ONLY the final enhanced English prompt in under 120 words."
      : "You are a professional AI image prompt engineer specializing in photorealistic generation. Enhance the description with rich visual details: lighting, composition, color palette, mood, camera angle, and photographic style. IMPORTANT: Do NOT include any text overlays or typography instructions. Return ONLY the enhanced English prompt in under 120 words."

    const result = await generateText({
      model: "google/gemini-3-flash",
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 200,
      temperature: 0.7,
    })

    console.log("[v0] Gemini enhanced prompt:", result.text.trim())
    return result.text.trim() || userPrompt
  } catch (error) {
    console.error("[v0] Gemini processPromptForImageGeneration ERROR:", error)
    // Fallback: return original prompt so FAL still runs
    return userPrompt
  }
}

// Special pipeline for image EDITING: preserve person/product features (fal-ai/flux-2/turbo/edit)
export async function processPromptForImageEditing(userPrompt: string): Promise<string> {
  try {
    const hasArabic = /[\u0600-\u06FF]/.test(userPrompt)

    // Check if user wants NO changes (preserve everything)
    const noChangePatterns = [
      /من غير ما تغير/i,
      /بدون ما تغير/i,
      /ما تغيرش/i,
      /متغيرش/i,
      /without chang/i,
      /don't change/i,
      /keep everything/i,
      /no change/i,
    ]
    const wantsNoChange = noChangePatterns.some((pattern) => pattern.test(userPrompt))

    const systemPrompt = hasArabic
      ? `You are a professional translator and AI image editing prompt engineer.
Translate the Arabic instruction to English, then produce a precise editing directive.

STRICT RULES:
1. Preserve 100% of the subject's facial features, identity, skin tone, and body proportions.
2. Preserve the original scene, location, and background ${wantsNoChange ? "ENTIRELY — change nothing" : "unless the user explicitly asks to change it"}.
3. Apply ONLY the changes the user explicitly requests (e.g., clothing color, accessories, lighting).
4. Describe the desired change as a photorealistic edit instruction.
5. Do NOT include text overlays or watermark instructions.
${wantsNoChange ? 'Return exactly: "Enhance image quality while preserving all original features, facial identity, scene, and background exactly as they are."' : "Return ONLY the editing instruction in English, under 80 words."}`.trim()
      : `You are a professional AI image editing prompt engineer.

STRICT RULES:
1. Preserve 100% of the subject's facial features, identity, skin tone, and body proportions.
2. Preserve the original scene, location, and background ${wantsNoChange ? "ENTIRELY — change nothing" : "unless the user explicitly asks to change it"}.
3. Apply ONLY the changes the user explicitly requests (e.g., clothing color, accessories, lighting).
4. Describe the desired change as a photorealistic edit instruction.
5. Do NOT include text overlays or watermark instructions.
${wantsNoChange ? 'Return exactly: "Enhance image quality while preserving all original features, facial identity, scene, and background exactly as they are."' : "Return ONLY the editing instruction in English, under 80 words."}`.trim()

    const result = await generateText({
      model: "google/gemini-3-flash",
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 150,
      temperature: 0.3,
    })

    let processedPrompt = result.text.trim() || userPrompt

    // Ensure preservation keywords are always present
    const hasPreservation =
      /preserve|keep|maintain|retain/i.test(processedPrompt)
    if (!hasPreservation) {
      processedPrompt = `Preserve all facial features, identity, skin tone, and original scene. ${processedPrompt}`
    }

    return processedPrompt
  } catch (error) {
    console.error("[edit] Prompt processing error:", error)
    // Fallback: ensure preservation instruction is always included
    return `Preserve all facial features, identity, skin tone, and original scene. ${userPrompt}`
  }
}

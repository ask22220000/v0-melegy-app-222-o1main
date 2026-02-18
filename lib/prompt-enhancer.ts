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

// Special pipeline for image editing: preserve character features and scene
export async function processPromptForImageEditing(userPrompt: string): Promise<string> {
  console.log("[v0] Processing edit prompt:", userPrompt.substring(0, 50))
  
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
    
    const wantsNoChange = noChangePatterns.some(pattern => pattern.test(userPrompt))
    
    const systemPrompt = hasArabic
      ? `You are a professional translator and AI image editing prompt engineer. First translate the Arabic text to English, then create an editing instruction.

CRITICAL RULES:
1. You MUST preserve 100% of the person's facial features, identity, and characteristics
2. You MUST preserve the original scene, location, and background ${wantsNoChange ? 'COMPLETELY - DO NOT modify anything' : 'unless explicitly requested to change'}
3. Only modify what the user specifically asks to change (clothing, accessories, lighting, etc.)
4. Focus on subtle enhancements while maintaining the original identity and scene
5. Remove any instructions to add text/words on the image

${wantsNoChange ? 'USER WANTS NO CHANGES - Return: "Enhance image quality while preserving all original features, facial characteristics, scene, and background exactly as they are"' : 'Return ONLY the editing instruction in English, under 80 words.'}`.trim()
      : `You are a professional AI image editing prompt engineer.

CRITICAL RULES:
1. You MUST preserve 100% of the person's facial features, identity, and characteristics
2. You MUST preserve the original scene, location, and background ${wantsNoChange ? 'COMPLETELY - DO NOT modify anything' : 'unless explicitly requested to change'}
3. Only modify what the user specifically asks to change (clothing, accessories, lighting, etc.)
4. Focus on subtle enhancements while maintaining the original identity and scene
5. Remove any instructions to add text/words on the image

${wantsNoChange ? 'USER WANTS NO CHANGES - Return: "Enhance image quality while preserving all original features, facial characteristics, scene, and background exactly as they are"' : 'Return ONLY the editing instruction in English, under 80 words.'}`.trim()

    console.log("[v0] Processing edit with Gemini 3 Flash (preserving features)...")
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
      maxTokens: 150,
      temperature: 0.3, // Lower temperature for more consistent preservation
    })

    let processedPrompt = result.text.trim() || userPrompt
    
    // Force preservation keywords if not present
    if (!processedPrompt.toLowerCase().includes('preserve') && 
        !processedPrompt.toLowerCase().includes('keep') &&
        !processedPrompt.toLowerCase().includes('maintain')) {
      processedPrompt = `Preserve all facial features and identity. ${processedPrompt}`
    }
    
    console.log("[v0] Final edit prompt:", processedPrompt.substring(0, 100))
    return processedPrompt
  } catch (error) {
    console.error("[v0] Edit processing error:", error)
    // Fallback: add preservation instruction manually
    return `Preserve all facial features, identity, and original scene. ${userPrompt}`
  }
}

// Shared prompt enhancement utility for FAL API calls

// Translate Arabic to English using Pollinations (Gemini)
export async function translateToEnglish(text: string): Promise<string> {
  try {
    // Detect if text is Arabic
    const hasArabic = /[\u0600-\u06FF]/.test(text)
    if (!hasArabic) {
      console.log("[v0] Text is already in English, skipping translation")
      return text
    }

    console.log("[v0] Translating Arabic text to English...")
    const response = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
        model: "openai",
        seed: Math.floor(Math.random() * 99999),
        jsonMode: false,
      }),
    })

    if (!response.ok) {
      console.error("[v0] Translation failed:", response.status)
      return text
    }

    const translated = await response.text()
    console.log("[v0] Translation result:", translated.substring(0, 100))
    return translated.trim()
  } catch (error) {
    console.error("[v0] Translation error:", error)
    return text
  }
}

// Enhance prompt for better AI image generation using Pollinations
export async function enhancePromptForImageGeneration(prompt: string): Promise<string> {
  try {
    console.log("[v0] Enhancing prompt with Pollinations (perplexity-fast)...")
    const response = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai",
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
        seed: Math.floor(Math.random() * 99999),
        jsonMode: false,
      }),
    })

    if (!response.ok) {
      console.error("[v0] Enhancement failed:", response.status)
      return prompt
    }

    const enhanced = (await response.text()).trim() || prompt
    console.log("[v0] Enhanced prompt:", enhanced.substring(0, 100))
    return enhanced
  } catch (error) {
    console.error("[v0] Enhancement error:", error)
    return prompt
  }
}

// Full pipeline: translate + enhance in one step using Pollinations
export async function processPromptForImageGeneration(userPrompt: string): Promise<string> {
  console.log("[v0] Processing prompt:", userPrompt.substring(0, 50))
  
  try {
    // Detect if Arabic
    const hasArabic = /[\u0600-\u06FF]/.test(userPrompt)
    const systemPrompt = hasArabic
      ? "You are a professional translator and AI image prompt engineer. First translate the Arabic text to English, then enhance it with professional visual details (lighting, composition, style, colors, mood). IMPORTANT: Remove any instructions to write or add text/words on the image. Focus ONLY on visual elements, not text overlays. Return ONLY the final enhanced English prompt in under 100 words."
      : "You are a professional AI image prompt engineer. Enhance the description with professional visual details (lighting, composition, style, colors, mood). IMPORTANT: Remove any instructions to write or add text/words on the image. Focus ONLY on visual elements, not text overlays. Return ONLY the enhanced prompt in under 100 words."

    console.log("[v0] Processing with Pollinations (perplexity-fast - translate + enhance)...")
    const response = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai",
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
        seed: Math.floor(Math.random() * 99999),
        jsonMode: false,
      }),
    })

    if (!response.ok) {
      console.error("[v0] Pollinations processing failed:", response.status)
      return userPrompt
    }

    const processedPrompt = (await response.text()).trim() || userPrompt
    console.log("[v0] Final processed prompt:", processedPrompt.substring(0, 100))
    return processedPrompt
  } catch (error) {
    console.error("[v0] Processing error:", error)
    return userPrompt
  }
}

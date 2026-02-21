import { NextResponse } from "next/server"

// Enhance prompt for better image quality using Perplexity
async function enhancePromptWithAI(prompt: string): Promise<string> {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey) {
      console.log("[v0] No API key, using original prompt")
      return prompt
    }

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content:
              "أنت Prompt Engineer متخصص في تحسين أوصاف الصور. حسّن الوصف بإضافة تفاصيل بصرية احترافية بدون تغيير المعنى الأساسي. رد بالإنجليزية فقط.",
          },
          {
            role: "user",
            content: `حسّن هذا الوصف للصورة: ${prompt}`,
          },
        ],
        max_tokens: 150,
      }),
    })

    if (!response.ok) {
      console.log("[v0] Enhancement failed, using original prompt")
      return prompt
    }

    const data = await response.json()
    const enhancedPrompt = data.choices?.[0]?.message?.content || prompt
    console.log("[v0] Enhanced prompt:", enhancedPrompt)
    return enhancedPrompt
  } catch (error) {
    console.error("[v0] Enhancement error:", error)
    return prompt
  }
}

// Translate Arabic to English using Perplexity
async function translateArabicToEnglish(arabicText: string): Promise<string> {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey) {
      console.log("[v0] No API key, using original text")
      return arabicText
    }

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are a translator. Translate the user's Arabic text to English for image generation. Keep the exact meaning and all details. Only return the translation, nothing else.",
          },
          {
            role: "user",
            content: arabicText,
          },
        ],
        max_tokens: 150,
      }),
    })

    if (!response.ok) {
      console.log("[v0] Translation failed, using fallback")
      return arabicText
    }

    const data = await response.json()
    const translation = data.choices?.[0]?.message?.content || arabicText

    if (!translation || translation.length < 5) {
      return arabicText
    }

    console.log("[v0] Translated to English:", translation)
    return translation
  } catch (error) {
    console.error("[v0] Translation error:", error)
    return arabicText
  }
}

async function generateImage(prompt: string): Promise<string> {
  console.log("[v0] Generating with Little Pear from Vision AI Studio...")

  const cleanPrompt = prompt
    .replace(/[*#[\]{}()]/g, "")
    .replace(/\s+/g, " ")
    .trim()

  const seed = Math.floor(Math.random() * 999999)
  const encodedPrompt = encodeURIComponent(cleanPrompt)

  // Using Pollinations API with Little Pear model from Vision AI Studio
  // Portrait 4:5 ratio - 1080x1350
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1350&model=little-pear&enhance=true&nologo=true&seed=${seed}`

  console.log("[v0] Image URL:", imageUrl)
  return imageUrl
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    console.log("[v0] User request:", prompt)

    // Translate Arabic to English
    let englishPrompt = await translateArabicToEnglish(prompt)
    console.log("[v0] English prompt:", englishPrompt)

    // Enhance with Prompt Engineer AI
    const enhancedPrompt = await enhancePromptWithAI(englishPrompt)
    console.log("[v0] Final enhanced prompt:", enhancedPrompt)

    // Generate image
    const imageUrl = await generateImage(enhancedPrompt)

    return NextResponse.json({ imageUrl })
  } catch (error: any) {
    console.error("[v0] Error:", error?.message || error)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
  }
}

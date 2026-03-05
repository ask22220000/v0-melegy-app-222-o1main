import { NextResponse } from "next/server"

// Step 1: Translate the Arabic prompt to English while strictly preserving
// ALL constraints — especially negative ones like "no hat", "bare head", "without X"
async function translateAndStructurePrompt(
  arabicText: string
): Promise<{ positive: string; negative: string }> {
  const apiKey = process.env.GROQ_API_KEY
  const fallback = { positive: arabicText, negative: "" }
  if (!apiKey) return fallback

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `You are a professional image prompt engineer. 
Translate the user's Arabic image description to English.

CRITICAL RULES:
1. Preserve ALL negative/exclusion constraints EXACTLY. 
   - Arabic negations: "ولا", "بدون", "من غير", "لا يرتدي", "مش لابس", "بدون غطاء رأس", etc.
   - These MUST become explicit negative_prompt entries AND must appear in the positive prompt as "without X", "no X", "bare X".
2. Do NOT add details that contradict the user's description.
3. Return ONLY valid JSON in this exact format (no markdown, no extra text):
{"positive": "...", "negative": "..."}

- "positive": the full English prompt including "without X" phrases for every negative constraint
- "negative": comma-separated list of things that must NOT appear (e.g. "headscarf, keffiyeh, turban, hat, head covering")`,
          },
          {
            role: "user",
            content: arabicText,
          },
        ],
      }),
    })

    if (!response.ok) return fallback
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim() || ""

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { positive: content || arabicText, negative: "" }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      positive: parsed.positive || arabicText,
      negative: parsed.negative || "",
    }
  } catch {
    return fallback
  }
}

// Step 2: Enhance visual quality WITHOUT touching constraints
async function enhancePositivePrompt(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return prompt

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content: `You are an image prompt enhancer.
Add cinematic quality details (lighting, style, camera angle) to the prompt.
RULES:
- NEVER remove or contradict any existing detail, especially "without X" or "no X" phrases — keep them word-for-word.
- NEVER add elements that were excluded by the user.
- Return ONLY the enhanced prompt text, nothing else.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) return prompt
    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || prompt
  } catch {
    return prompt
  }
}

async function generateImage(positive: string, negative: string): Promise<string> {
  const cleanPositive = positive.replace(/[*#[\]{}()]/g, "").replace(/\s+/g, " ").trim()
  const seed = Math.floor(Math.random() * 999999)
  const encodedPrompt = encodeURIComponent(cleanPositive)

  let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1350&model=little-pear&enhance=true&nologo=true&seed=${seed}`

  if (negative) {
    const cleanNegative = negative.replace(/\s+/g, " ").trim()
    url += `&negative=${encodeURIComponent(cleanNegative)}`
  }

  return url
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Step 1: Translate + extract negative constraints
    const { positive: englishPrompt, negative } = await translateAndStructurePrompt(prompt)

    // Step 2: Enhance visual quality without touching constraints
    const enhancedPrompt = await enhancePositivePrompt(englishPrompt)

    // Step 3: Generate image with both positive and negative prompts
    const imageUrl = await generateImage(enhancedPrompt, negative)

    return NextResponse.json({ imageUrl })
  } catch (error: any) {
    console.error("[v0] Error:", error?.message || error)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
  }
}

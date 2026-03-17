import Groq from "groq-sdk"

function getGroqClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY || "" })
}

async function translateToEnglish(prompt: string): Promise<string> {
  const groq = getGroqClient()
  const hasArabic = /[\u0600-\u06FF]/.test(prompt)
  if (!hasArabic) return prompt
  try {
    const res = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a professional translator. Translate the following Arabic text (including Egyptian dialect) to English. Return ONLY the English translation — no explanations, no extra text.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 300,
    })
    return res.choices[0]?.message?.content?.trim() || prompt
  } catch {
    return prompt
  }
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const englishPrompt = await translateToEnglish(prompt)

    // Build video URL with proper query parameters
    const params = new URLSearchParams({
      model: "veo", // Video model
      duration: "10", // 10 seconds for paid plans
      aspect_ratio: "16:9", // Widescreen format
      private: "true", // Don't add to public feed
      enhance: "true", // Enhance the prompt
      nofeed: "true",
    })

    // Encode the translated prompt
    const encodedPrompt = encodeURIComponent(englishPrompt)

    // Pollinations video generation endpoint
    const videoUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`

    return new Response(
      JSON.stringify({
        url: videoUrl,
        prompt: englishPrompt,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("[v0] Video generation error:", error)

    return new Response(
      JSON.stringify({
        error: "فشل توليد الفيديو",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

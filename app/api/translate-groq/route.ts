import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

    // استخدام Groq للترجمة من العربي للإنجليزي
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a professional prompt engineer translator. Translate Arabic text to English for image generation. Keep the exact meaning and details. Return only the translation.",
          },
          {
            role: "user",
            content: text,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      console.error("[v0] Groq translation error:", response.statusText)
      return NextResponse.json({ error: "Translation failed" }, { status: 500 })
    }

    const data = await response.json()
    const translation = data.choices?.[0]?.message?.content?.trim() || text

    console.log("[v0] Translated text:", translation)

    return NextResponse.json({ translation })
  } catch (error) {
    console.error("[v0] Translation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

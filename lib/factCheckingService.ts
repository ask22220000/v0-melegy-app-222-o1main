export interface FactCheckResult {
  claim: string
  verdict: "true" | "false" | "partially-true" | "unverified"
  confidence: number
  evidence: string[]
  sources: string[]
}

export async function checkFact(claim: string): Promise<FactCheckResult> {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY

    if (!apiKey) {
      throw new Error("PERPLEXITY_API_KEY is not configured")
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
            content: "أنت مساعد متخصص في التحقق من الحقائق والمعلومات بدقة.",
          },
          {
            role: "user",
            content: `تحقق من صحة هذا الادعاء واعطني تحليل دقيق: ${claim}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.5,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    let analysis = data.choices?.[0]?.message?.content || ""

    analysis = analysis
      .replace(/\*\*/g, "")
      .replace(/\[\d+\]/g, "")
      .replace(/\s+/g, " ")
      .trim()

    return {
      claim,
      verdict: "unverified",
      confidence: 0.7,
      evidence: [analysis],
      sources: [],
    }
  } catch (error) {
    console.error("[v0] Fact checking error:", error)
    return {
      claim,
      verdict: "unverified",
      confidence: 0,
      evidence: ["فشل التحقق من المعلومة"],
      sources: [],
    }
  }
}

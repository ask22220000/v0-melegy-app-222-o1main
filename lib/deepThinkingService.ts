export async function deepThink(problem: string): Promise<string> {
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
            content: "أنت مساعد ذكي متخصص في التفكير العميق وحل المشكلات المعقدة.",
          },
          {
            role: "user",
            content: `فكر بعمق في هذه المشكلة وحللها بالتفصيل: ${problem}`,
          },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    let result = data.choices?.[0]?.message?.content || "فشل التفكير العميق"

    result = result
      .replace(/\*\*/g, "")
      .replace(/\[\d+\]/g, "")
      .replace(/\s+/g, " ")
      .trim()

    return result
  } catch (error) {
    console.error("[v0] Deep thinking error:", error)
    return "حدث خطأ في عملية التفكير العميق"
  }
}

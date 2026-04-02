const FAL_KEY = process.env.FAL_KEY || "a39c63bd-f0c0-434e-a097-3b2db83e10d6:b4690234c50913962db3917c022cffc2"

export interface FalChatOptions {
  model?: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
}

/**
 * Call Fal OpenRouter via REST API directly - bypasses client auth issues.
 */
export async function falChat(
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
  options: FalChatOptions = {}
): Promise<string> {
  const {
    model = "google/gemini-2.5-flash",
    systemPrompt,
    maxTokens = 600,
    temperature = 0.7,
  } = options

  // Build conversation context from history
  let conversationContext = ""
  if (history.length > 0) {
    const recent = history.slice(-8)
    conversationContext = recent
      .map((m) => {
        const role = m.role === "assistant" ? "ميليجي" : "المستخدم"
        return `${role}: ${m.content}`
      })
      .join("\n")
    conversationContext += "\n"
  }

  const fullPrompt = conversationContext + `المستخدم: ${userMessage}\nميليجي:`

  const body: Record<string, any> = {
    model,
    prompt: fullPrompt,
    max_tokens: maxTokens,
    temperature,
  }
  if (systemPrompt) body.system_prompt = systemPrompt

  const res = await fetch("https://fal.run/openrouter/router", {
    method: "POST",
    headers: {
      "Authorization": `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Fal API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return (data?.output || "").trim()
}

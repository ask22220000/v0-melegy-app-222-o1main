import { createFalClient } from "@fal-ai/client"

const FAL_KEY = process.env.FAL_KEY || "a39c63bd-f0c0-434e-a097-3b2db83e10d6:b4690234c50913962db3917c022cffc2"

const falClient = createFalClient({ credentials: FAL_KEY })

export interface FalChatOptions {
  model?: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
}

/**
 * Call Fal OpenRouter for text generation.
 * Builds a single prompt string from conversation history + current message.
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

  const result = await falClient.subscribe("openrouter/router", {
    input: {
      model,
      prompt: fullPrompt,
      ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
      max_tokens: maxTokens,
      temperature,
    },
  })

  const data = result.data as any
  return (data?.output || "").trim()
}
